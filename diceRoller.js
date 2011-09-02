// JS Extensible Dice InitiativE (jeDIE) v2
// A string parser that extracts nd replaces dice rolls in text
// by Jay Crossler, Open Source CC-BY license - feel free to use/reuse/derive/make $, just give me credit!

//TODO: Handle signs in NWOD rolls, ie: 4W-2W should ? calc successes on 4, subtract successes on 2?
//TODO: Have a better way of wrapping results, or parsing so text isn't accidently rerolled
//TODO: Have a different random number generator, potentially with a deterministic seed: http://davidbau.com/archives/2010/01/30/random_seeds_coded_hints_and_quintillions.html
//TODO: Either show images of dice as results, or generate them on the fly using canvas or three.js

var TextParsers = {
    defaultFormatReturned: 'shorthtml',

    //Text parsers and dice rollers
    replaceDiceRolls: function(text,formatType) {
        //Note, when building REs, suggest using: http://regexpal.com/ (and take out the starting and ending / when pasting into page)
        var parsingExpressions = [{
            exp: /(?:[0-9]+[dD][0-9]+[e]{0,1}\s*[+-]{0,1}\s*[0-9]*(?![dD])[+]{0,1})+|\[\s*(?:[0-9]+[dD][0-9]+[e]{0,1}\s*[+-]{0,1}\s*[0-9]*(?![dD])[+]{0,1})+\s*\]/ ,
            func: this.buildResponseStringFromStandardDiceRolls,
            parserName: "Dice Roller",
            sampleUsage: "1d8 or [2d10] or 3d5+7 or [2d10+4+1d4 - 1d10]"
          },{
            exp: /\[\s*(\+{0,1}\s*[0-9]+[wW][0-9]*([rR]{0,1}[oOtTeE]*|[!])*\s*)+\]|\/roll[\s:=]*\[{0,1}\s*(\+{0,1}\s*[0-9]+[wW][0-9]*([rR]{0,1}[oOtTeE]*|[!])*\s*)+\]{0,1}/ ,
            func: this.buildResponseStringFromNWODRolls,
            parserName: "NWOD Succes Calculator",
            sampleUsage: "[1w] or [2W!] (reroll 9s not just 10s) or [5wRote] (1st aren't a failure) or /roll 2w or /roll: [ 2w + 4w!]"
        }];

        //TODO: Results can still be interpreted by other parsers - possibly have a {protected} ignored wrapper around results?
        var numEmptyMatches=0;
        var loopCount=0;
        while((numEmptyMatches<parsingExpressions.length) && (loopCount <4)) {
            loopCount++;
            numEmptyMatches=0;
            for ( var i=0; i<parsingExpressions.length; i++) {
                var re = parsingExpressions[i];
                var item_matched = text.match(re.exp);

                if (item_matched && item_matched.length > 0) {
                    var dicetext = item_matched[0];
                    var loc = text.indexOf(dicetext);
                    var result_roll = TextParsers.rollTheDice(re.func,dicetext,formatType || this.defaultFormatReturned);
                    text = text.substr(0,loc) + result_roll + text.substr(loc+dicetext.length);
                } else {
                    numEmptyMatches++;
                }
            }
        }
        return text;
    },
//==String building functions==========================================================

    buildResponseStringFromNWODRolls: function(input,formatType) {
        var response = TextParsers.buildArrayFromNWODDiceRolls(input);
        //Rules:
        //Ones don't cancel. Otherwise: if (rolls[j]==1) successes--;
        //Gain extra roll with a 10, or 9 with !, or 8 with !! (can result in multiple extra rolls)
        //If have rote power, reroll first failure

        switch (formatType) {
            case 'fullhtml':
                var resultText = "";
                var successes =0;
                for ( j=0; j<response.rolls.length; j++) {
                    if (response.rolls[j]>=response.rollsuccess[j]) successes++;
                    resultText+= "<span class='dieresult" + (response.rolls[j] >= response.rollsuccess[j] ? " diesuccess" : " diefailure") +"'>";
                    resultText+= "die "+(j+1)+": "+response.rolls[j]+"("+response.rollsuccess[j]+" succeeds, "+response.rollagains[j]+" rolls again) " + response.rollhistory[j]+"</span><br/>";
                }
                var output="<span class='rollresponse'>{<span class='dieinput'>"+response.input+":</span> <span class='dieresult" + (successes > 0 ? " diesuccess" : " diefailure") +"'>";
                    output+=successes+" "+TextParsers.pluralizeSuccess(successes)+"</span>}</span><br/><div class='dieinput'>" + resultText + "</div>";
                return output;
                break;
            case 'longhtml':
                var titletext = "";
                var successes =0;
                for ( j=0; j<response.rolls.length; j++) {
                    if (response.rolls[j]>=response.rollsuccess[j]) successes++;
                    titletext+= "die "+(j+1)+": "+response.rolls[j]+"("+response.rollsuccess[j]+" succeeds, "+response.rollagains[j]+" rolls again) " + response.rollhistory[j]+"\n";
                }

                var resultText = "";
                for ( j=0; j<response.rolls.length; j++) {
                    resultText+= " "+response.rolls[j]+":"+response.rollsuccess[j]+response.rollhistory[j].charAt(0)+",";
                }
                var output="<span class='rollresponse' title='"+titletext.substr(0,titletext.length-1)+"'>{<span class='dieinput'>"+response.input+":"+resultText+"</span>";
                    output+="<span class='dieresult" + (successes > 0 ? " diesuccess" : " diefailure") +"'>"
                    output+=successes+" "+TextParsers.pluralizeSuccess(successes)+"</span>}</span>";
                return output;
                break;
            case 'shorthtml':
                var resultText = "";
                var successes =0;
                for ( j=0; j<response.rolls.length; j++) {
                    if (response.rolls[j]>=response.rollsuccess[j]) successes++;
                    resultText+= "die "+(j+1)+": "+response.rolls[j]+"("+response.rollsuccess[j]+" succeeds, "+response.rollagains[j]+" rolls again) " + response.rollhistory[j]+"\n";
                }
                var output="<span class='rollresponse' title='"+resultText.substr(0,resultText.length-1)+"'>{<span class='dieinput'>"+response.input+":</span>";
                    output+="<span class='dieresult" + (successes > 0 ? " diesuccess" : " diefailure") +"'>"
                    output+=successes+" "+TextParsers.pluralizeSuccess(successes)+"</span>}</span>";
                return output;
                break;
            case 'longtext':
                var resultText = "";
                var successes =0;
                for ( j=0; j<response.rolls.length; j++) {
                    if (response.rolls[j]>=response.rollsuccess[j]) successes++;
                    resultText+= " "+response.rolls[j]+":"+response.rollsuccess[j]+response.rollhistory[j].charAt(0)+",";
                }
                return successes + " {"+response.input+"="+resultText.substr(0,resultText.length-1)+"} ";
                break;
            case 'shorttext':
                var resultText = "";
                var successes =0;
                for ( j=0; j<response.rolls.length; j++) {
                    if (response.rolls[j]>=response.rollsuccess[j]) successes++;
                    resultText+= " "+response.rolls[j]+":"+response.rollsuccess[j]+response.rollhistory[j].charAt(0)+",";
                }
                return " {"+response.input+": "+successes+"}";
                break;
            case 'result':
            default:
                var successes =0;
                for ( j=0; j<response.rolls.length; j++)
                    if (response.rolls[j]>=response.rollsuccess[j]) successes++;
                return successes;
                break;
        }
        //If no format option matched, return the entered text
        return input;
    },

    buildResponseStringFromStandardDiceRolls: function(input, formatType) {
        var response = TextParsers.buildArrayFromStandardDiceRolls(input);
//TODO: Rolls are being embedded, fix
        switch (formatType) {
            case 'fullhtml':
            case 'longhtml':
            case 'shorthtml':
                var total = 0;
                var output = [];
                for ( var i=0; i<response.res.length; i++) {
                    var result = response.res[i];
                    var dicety = response.type[i];
                    total+=result;

                    if (dicety == 0) {
                        output.push(((result>0)? "+" : "") + result);
                    } else {
                        output.push(result+"/"+dicety);
                    }
                }
                var resultText = "<span class='rollresponse' title='"+output.join(", ")+"'>{<span class='dieinput'>"+response.input;
                    resultText+= ":</span> <span class='dieresult diesuccess'>"+total+"</span>}</span>";
                return resultText;
                break;
            case 'longtext':
            case 'shorttext':
                var resultText = "";
                var total = 0;
                var output = [];
                for ( var i=0; i<response.res.length; i++) {
                    var result = response.res[i];
                    var dicety = response.type[i];

                    if (dicety == 0) {
                        output.push(((result>0)? "+" : "") + result);
                    } else {
                        output.push(result+"/"+dicety);
                    }
                    total+=result;
                }
                return total + " [" + output.join(", ") + "]";
                break;
            case 'result':
            default:
                var total=0;
                for (var i=0; i<response.res.length; i++)
                    total+=response.res[i];
                return total;
                break;
        }
        //If no format option matched, return the entered text
        return input;
    },

//==Rolling and Parsing functions==========================================================
    buildArrayFromNWODDiceRolls: function(input) {
        if (!input || (input.length<2)) return input;
        var input = input.replace(/W/,'w');
        var input = input.replace(/- */,'+ -');
        var input = input.replace(/\/roll[:= ]*/,'');
        var input = input.replace(/R/,'r');
        var input = input.replace(/ote/,'');

        var first = input.charAt(0);
        var last =  input.charAt(input.length-1);
        if (((first == "[") && (last == "]")) || ((first == "(") && (last == ")"))){
            input = input.substr(1,input.length-2).trim();
        }
        var re = / *\+ */;
        var items = input.split(re);
        var rolls = [];
        var rollhistory = [];
        var rollsuccess = [];
        var rollagains = [];
        for ( var i=0; i<items.length; i++) {
            var die=items[i];
            var wpos = die.indexOf("w");
            if (wpos<1) break;
            //TODO: Handle signs

            var numrolls = parseInt(die.substr(0,wpos) || 1);
            var options = die.substr(wpos+1) || "";
            var isrote = options.indexOf("r")>-1;
            var successat = 8;
            if (options && (options.length > 0) && (parseInt(options) > 0)) {
                successat = parseInt(options) || successat;
            }
            var numagains = options.replace(/[^!]/g, '').length
            var rollagain = 10 - numagains;

            var extrarolls = 0; //Rerolls from rote failures
            for ( j=0; j<numrolls; j++) {
                var roll = TextParsers.d(10);
                var rollsucc = successat;
                var rollid = j;
                var rollhist = "";

                if (isrote && (roll < successat)) {
                    //Rote power, reroll failure once
                    rollhist = "Rote: Failure, but reroll once";
                    extrarolls++;
                } else if (roll >= rollagain) {
                    //Power gives extra roll
                    rollhist = "Again: Extra roll from "+ TextParsers.repeatString("!",numagains) +", "+ (roll < successat) ? "Success" : "Failure";
                    numrolls++;
                } else if (roll < successat) {
                    rollhist = "Normal Roll: Fail"
                } else {
                    rollhist = "Normal Roll: Success"
                }

                rolls[rollid] = roll;
                rollsuccess[rollid] = rollsucc;
                rollhistory[rollid] = rollhist;
                rollagains[rollid] = rollagain;
            }
            for ( j=0; j<extrarolls; j++) {
                var roll = TextParsers.d(10);
                var rollhist = "Extra Roll"
                var rollsucc = successat;
                var rollid = numrolls+j;
                if (roll >= rollagain) {
                    //Power gives extra roll
                    rollhist = "Again: Extra roll from "+ TextParsers.repeatString("!",numagains) +", "+ (roll < successat) ? "Success" : "Failure";
                    extrarolls++;
                } else if (roll < successat) {
                    rollhist = "Extra Roll: Fail"
                } else {
                    rollhist = "Extra Roll: Success"
                }
                rolls[rollid] = roll;
                rollsuccess[rollid] = rollsucc;
                rollhistory[rollid] = rollhist;
                rollagains[rollid] = "X";
            }

        }
        return {rolls:rolls, rollhistory:rollhistory, rollsuccess:rollsuccess, rollagains:rollagains, input:input};
    },

    buildArrayFromStandardDiceRolls: function(input) {
        //Derived from diceroller Github Opensource project
        //Rolls dice pared from normal [3d6] pattern, returns array of results
        if (!input || (input.length<2)) return input;
        var first = input.charAt(0);
        var last =  input.charAt(input.length-1);
        if (((first == "[") && (last == "]")) || ((first == "(") && (last == ")"))){
            input = input.substr(1,input.length-2).trim();
        }

        var dice = input.replace(/- */,'+ -');
        dice = dice.replace(/D/,'d');
        dice = dice.replace(/S/,'s');
        var re = / *\+ */;
        var items = dice.split(re);
        var res = new Array();
        var type = new Array();
        for ( var i=0; i<items.length; i++) {
            var match = items[i].match(/^[ \t]*(-)?(\d+)?(?:(d)(\d+))?[ \t]*$/);
            if (match) {
                var sign = match[1]?-1:1;
                var num = parseInt(match[2] || "1");
                var max = parseInt(match[4] || "0");
                if (match[3]) {
                    for ( j=1; j<=num; j++) {
                        res[res.length] = sign * Math.ceil(max*Math.random());
                        type[type.length] = max;
                    }
                }
                else {
                    res[res.length] = sign * num;
                    type[type.length] = 0;
                }
            }
            else return {"res":[], "type":[]};
        }
        if (res.length == 0) return {res:[], type:[], input:""};
        input = input.replace('d','<i>d</i>'); //TODO: Have some other way to indicate not to reapply dice roll
        return {res:res, type:type, input:input};
    },
    rollTheDice: function(diceType,input,formatType) {
        //Reflexive function applier
        return diceType(input,formatType);
    },
    d: function(sides) {
        //Rolls an "n-sided die"
        return Math.ceil(sides*Math.random());
    },
    pluralizeSuccess: function(num) {
        return (num > 1) ? "successes" : (num == 1) ? "success" : "failure";
    },
    repeatString: function(str,times) {
        var returnstr = "";
        for (var i=0;i<times;i++) returnstr+=str;
        return returnstr;
    }
}
