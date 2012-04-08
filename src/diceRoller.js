// JS Extensible Dice InitiativE (jeDIE) v3.3
// This file contains extensions to a "TextParsers" class to parse and swap text with Dice rolls
//
// Summary: A string parser that extracts and replaces dice rolls in text, allows both D&D-type (D) dice rolls and World Of Darkness (NWOD)-type rolls
//
// Currently supports calls such as:
// var result = TextParsers.replaceDiceRolls("I roll [3d6]").text
// var result = TextParsers.roll("I roll [3w]").text
// var resxml = TextParsers.roll("I roll [5wr!]","xml")
// var resjson = TextParsers.roll("[5w]","json").text
// var result = TextParsers.roll("[10d4+3d2+5]!","result").text
// var result = TextParsers.die("20").text
// var result = TextParsers.d("2d20").text
// var result = TextParsers.d("3d10+4").text
// var result = TextParsers.w("5w").text

//
// by Jay Crossler, Open Source CC-BY license - feel free to use/reuse/derive/make $, just give me credit!

//NOTE: All the rules for parsing out dice rolls are in TextParsers.parsingExpressions at the end of the file

// Exporter function for including within NodeJS for server-based rolls.
// Remove these three lines if you are having trouble with an existing exports class
if (typeof exports != "undefined") exports.parseBlip = function (text, format) {
    return TextParsers.replaceDiceRolls(text, format || 'xml').text;
};

//The TextParsers Library for parsing through dice roll text
if (typeof TextParsers == "undefined") TextParsers = {}; // Create the class if it doesn't already exist

TextParsers.defaultDiceFormatReturned = 'shorthtml';
TextParsers.replaceDiceRolls = TextParsers.roll =  function(text, formatType) {
    //Note, when building REs, suggest using: http://regexpal.com/ (and take out the starting and ending / when pasting into page)

    var numEmptyMatches = 0;
    var loopCount = 0;
    var breakAfterFound = false;
    var remainingText = text;
    var result = {text:'',rolls:[]};

    //TODO: Have the nearest parser run first, not the next in the order - as "[2d6] and [2d6] and [3w]" misses roll 2
    while ((numEmptyMatches < this.parsingExpressions.length) && (loopCount < 20)) {
        loopCount++;
        numEmptyMatches = 0;
        for (var i = 0; i < this.parsingExpressions.length; i++) {
            var re = this.parsingExpressions[i];

            var item_matched = remainingText.match(re.exp);

            if (item_matched && item_matched.length > 0) {
                var diceText = item_matched[0];
                var loc = remainingText.indexOf(diceText);
                var theRoll = TextParsers.rollTheDice(re.func, diceText, 'array');
                var startText = remainingText.substr(0,loc);
                if (loc>0) {
                    //There was text before the matched point
                    result.rolls.push({format:'text',input:startText});
                }
                result.rolls.push(theRoll);
                remainingText = remainingText.substr(loc + diceText.length);
                if (re.runOnce) {
                    breakAfterFound = true;
                    break;
                }
            } else {
                numEmptyMatches++;
            }
        }
        if (breakAfterFound) break; //This RegEx should only be run once, so exit
    }
    if (remainingText && remainingText.length && remainingText.length>0){
        result.rolls.push({format:'text', input:remainingText});
    }
    result.text = this.buildStringFromRollsArray(result, formatType || this.defaultDiceFormatReturned);
    return result;
};

//==String building functions==========================================================
TextParsers.buildStringFromRollsArray = function(rollsArray, outputFormat){
    var outputStr = "";
    var foundParser = false;
    if (rollsArray && rollsArray.rolls && rollsArray.rolls.length && rollsArray.rolls.length > 0) {
        for (var r=0;r<rollsArray.rolls.length;r++){
            var roll = rollsArray.rolls[r];
            if (roll.format) {
                if (roll.format == 'text') {
                    outputStr+=roll.input || "";
                    foundParser = true;
                } else {
                    for(var p=0;p<TextParsers.parsingExpressions.length;p++) {
                        if(TextParsers.parsingExpressions[p].format == roll.format){
                            outputStr+=TextParsers.parsingExpressions[p].func('',outputFormat,roll);
                            foundParser = true;
                            break;
                        }
                    }
                }
            }
        }
    }
    if (!foundParser) {
        //Doesn't seem to be a valid array, return what was sent in
        outputStr = rollsArray.text || rollsArray;
    }
    return outputStr;
};
// Text parsers:
TextParsers.buildResponseStringFromNWODRolls = TextParsers.w = function(input, formatType, useArrayInstead) {
    var response = useArrayInstead || TextParsers.buildArrayFromNWODDiceRolls(input);
    //Rules:
    //Ones don't cancel. Otherwise: if (rolls[j]==1) successes--;
    //Gain extra roll with a 10, or 9 with !, or 8 with !! (can result in multiple extra rolls)
    //If have rote power, reroll first failure

    var successes = "";
    var output = "";
    var resultText = "";

    switch (formatType) {
        case 'array':
            output = response;
            break;
        case 'json':
            output = JSON.stringify(response);
            break;
        case 'xml':
            var strX = "";
            successes = 0;
            var diceText = "";
            for (var j = 0; j < response.rolls.length; j++) {
                var roll = response.rolls[j];
                var successat = response.rollsuccess[j];
                var history = response.rollhistorymin[j];
                var againat = response.rollagains[j];
                var ifsuccess = false;
                if (roll >= successat) {
                    successes++;
                    ifsuccess = true;
                }
                strX += "<roll value='" + roll + "' succeeds='" + ifsuccess + "' detail='" + history + "' againat='" + againat + "'></roll>";
                diceText += roll + "/" + successat + ":" + history.charAt(0);
            }
            diceText = '<text>' + successes + " " + TextParsers.pluralizeSuccess(successes) + ": " + diceText + "</text>";
            output = "<dice type='nwod' text='" + response.input + "' successes='" + successes + "' die='10'>";
            output += diceText + strX + "</dice>";
            break;
        case 'fullhtml':
            resultText = "";
            successes = 0;
            for (j = 0; j < response.rolls.length; j++) {
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
                resultText += "<span class='dieresult" + (response.rolls[j] >= response.rollsuccess[j] ? " diesuccess" : " diefailure") + "'>";
                resultText += "die " + (j + 1) + ": " + response.rolls[j] + "(" + response.rollsuccess[j] + " succeeds, " + response.rollagains[j] + " rolls again) " + response.rollhistory[j] + "</span><br/>";
            }
            output = "<span class='rollresponse'>{<span class='dieinput'>" + response.input + ":</span> <span class='dieresult" + (successes > 0 ? " diesuccess" : " diefailure") + "'>";
            output += successes + " " + TextParsers.pluralizeSuccess(successes) + "</span>}</span><br/><div class='dieinput'>" + resultText + "</div>";
            break;
        case 'longhtml':
            var titletext = "";
            successes = 0;
            for (j = 0; j < response.rolls.length; j++) {
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
                titletext += "die " + (j + 1) + ": " + response.rolls[j] + "(" + response.rollsuccess[j] + " succeeds, " + response.rollagains[j] + " rolls again) " + response.rollhistory[j] + "\n";
            }

            resultText = "";
            for (j = 0; j < response.rolls.length; j++) {
                resultText += " " + response.rolls[j] + ":" + response.rollsuccess[j] + response.rollhistory[j].charAt(0) + ",";
            }
            output = "<span class='rollresponse' title='" + titletext.substr(0, titletext.length - 1) + "'>{<span class='dieinput'>" + response.input + ":" + resultText + "</span>";
            output += "<span class='dieresult" + (successes > 0 ? " diesuccess" : " diefailure") + "'>";
            output += successes + " " + TextParsers.pluralizeSuccess(successes) + "</span>}</span>";
            break;
        case 'shorthtml':
            resultText = "";
            successes = 0;
            for (j = 0; j < response.rolls.length; j++) {
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
                resultText += "die " + (j + 1) + ": " + response.rolls[j] + "(" + response.rollsuccess[j] + " succeeds, " + response.rollagains[j] + " rolls again) " + response.rollhistory[j] + "\n";
            }
            output = "<span class='rollresponse' title='" + resultText.substr(0, resultText.length - 1) + "'>{<span class='dieinput'>" + response.input + ":</span>";
            output += "<span class='dieresult" + (successes > 0 ? " diesuccess" : " diefailure") + "'>";
            output += successes + " " + TextParsers.pluralizeSuccess(successes) + "</span>}</span>";
            break;
        case 'longtext':
            resultText = "";
            successes = 0;
            for (j = 0; j < response.rolls.length; j++) {
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
                resultText += " " + response.rolls[j] + ":" + response.rollsuccess[j] + response.rollhistory[j].charAt(0) + ",";
            }
            output = successes + " {" + response.input + "=" + resultText.substr(0, resultText.length - 1) + "} ";
            break;
        case 'shorttext':
            resultText = "";
            successes = 0;
            for (j = 0; j < response.rolls.length; j++) {
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
                resultText += " " + response.rolls[j] + ":" + response.rollsuccess[j] + response.rollhistory[j].charAt(0) + ",";
            }
            output = " {" + response.input + ": " + successes + "}";
            break;
        case 'result':
        default:
            successes = 0;
            for (j = 0; j < response.rolls.length; j++)
                if (response.rolls[j] >= response.rollsuccess[j]) successes++;
            output = successes;
            break;
    }
    //If no format option matched, return the entered text
    return output;
};
TextParsers.buildResponseStringFromStandardDiceRolls = TextParsers.d = function(input, formatType, useArrayInstead) {
    var response = useArrayInstead || TextParsers.buildArrayFromStandardDiceRolls(input);

    var total = 0;
    var output = input;
    var result = 0;
    var dicety = 0;
    var resultText = "";
    var rollnum = 0;

    switch (formatType) {
        case 'array':
            return response;
            break;
        case 'json':
            return JSON.stringify(response);
            break;
        case 'xml':
            total = 0;
            output = [];
            var diceText = "";
            var strX = "";
            for (rollnum = 0; rollnum < response.res.length; rollnum++) {
                result = response.res[rollnum];
                dicety = response.type[rollnum];
                total += result;
                if (dicety == 0) {
                    strX += "<mod value='" + ((result > 0) ? "+" : "") + result + "'></mod>";
                    output.push (((result > 0) ? " + " : "") + result);
                } else {
                    strX += "<roll value='" + result + "' die='" + dicety + "'></roll>";
                    output.push ( result + "/" + dicety);
                }
            }
            diceText = '<text>{' + total + ": " + output.join(",") + '}</text>';
            output = "<dice type='d' text='" + response.input + "' total='" + total + "'>" + diceText + strX + "</dice>";
            break;
        case 'fullhtml':
        case 'longhtml':
            total = 0;
            output = [];
            for (rollnum = 0; rollnum < response.res.length; rollnum++) {
                result = response.res[rollnum];
                dicety = response.type[rollnum];
                total += parseInt(result);

                if (dicety == 0) {
                    output.push(((result > 0) ? "+" : "") + result);
                } else {
                    output.push(result + "/" + dicety);
                }
            }
            resultText = "<span class='rollresponse'>{<span class='dieinput'>" + response.input;
            resultText += ":</span> <span class='dieresult diesuccess'>" + total + "</span>:" + output.join(",") + "}</span>";
            output = resultText;
            break;
        case 'shorthtml':
            total = 0;
            output = [];
            for (rollnum = 0; rollnum < response.res.length; rollnum++) {
                result = response.res[rollnum];
                dicety = response.type[rollnum];
                total += parseInt(result);

                if (dicety == 0) {
                    output.push(((result > 0) ? "+" : "") + result);
                } else {
                    output.push(result + "/" + dicety);
                }
            }
            resultText = "<span class='rollresponse' title='" + output.join(", ") + "'>{<span class='dieinput'>" + response.input;
            resultText += ":</span> <span class='dieresult diesuccess'>" + total + "</span>}</span>";
            output = resultText;
            break;
        case 'longtext':
        case 'shorttext':
            resultText = "";
            total = 0;
            output = [];
            for (rollnum = 0; rollnum < response.res.length; rollnum++) {
                result = response.res[rollnum];
                dicety = response.type[rollnum];

                if (dicety == 0) {
                    output.push(((result > 0) ? "+" : "") + result);
                } else {
                    output.push(result + "/" + dicety);
                }
                total += result;
            }
            output = total + " [" + output.join(", ") + "]";
            break;
        case 'result':
        default:
            total = 0;
            for (rollnum = 0; rollnum < response.res.length; rollnum++)
                total += response.res[rollnum];
            output = total;
            break;
    }
    //If no format option matched, return the entered text
    return output;
};

TextParsers.buildStringFromXML = function(diceArray, type, formatType) {
    //Used by the jquery.parseDice plugin
    if (type) switch (type.toLowerCase() || 'd') {
        case 'nwod':
            return TextParsers.buildResponseStringFromNWODRolls('', formatType, diceArray);
            break;
        case 'd':
            return TextParsers.buildResponseStringFromStandardDiceRolls('', formatType, diceArray);
            break;
    }
    return JSON.stringify(diceArray);
};

//==Rolling and Parsing functions==========================================================
TextParsers.buildArrayFromNWODDiceRolls = function(input) {
    //parse the text, roll dice, and output an array

    if (!input || (input.length < 2)) return input;
    input = input.replace(/W/, 'w');
    input = input.replace(/- */, '+ -');
    input = input.replace(/\/roll[:= ]*/, '');
    input = input.replace(/R/, 'r');
    input = input.replace(/ote/, '');

    var first = input.charAt(0);
    var last = input.charAt(input.length - 1);
    if (((first == "[") && (last == "]")) || ((first == "(") && (last == ")"))) {
        input = input.substr(1, input.length - 2).trim();
    }
    var re = / *\+ */;
    var items = input.split(re);
    var rolls = [];
    var rollhistory = [];
    var rollhistorymin = [];
    var rollsuccess = [];
    var rollagains = [];
    for (var i = 0; i < items.length; i++) {
        var die = items[i];
        var wpos = die.indexOf("w");
        if (wpos < 1) break;

        var numrolls = parseInt(die.substr(0, wpos) || 1);
        var options = die.substr(wpos + 1) || "";
        var isrote = options.indexOf("r") > -1;
        var successat = 8;
        if (options && (options.length > 0) && (parseInt(options) > 0)) {
            successat = parseInt(options) || successat;
        }
        var numagains = options.replace(/[^!]/g, '').length;
        var rollagain = 10 - numagains;

        var extrarolls = 0; //Rerolls from rote failures
        var rollhistmin;
        for (var j = 0; j < numrolls; j++) {
            roll = TextParsers.die(10);
            rollid = j;
            rollhist = "";
            rollhistmin = "";

            if (isrote && (roll < successat)) {
                //Rote power, reroll failure once
                rollhist = "Rote: Failure, but reroll once";
                rollhistmin = "Rote Reroll";
                extrarolls++;
            } else if (roll >= rollagain) {
                //Power gives extra roll
                rollhist = "Again: Extra roll from " + TextParsers.repeatString("!", numagains) + ", " + (roll < successat) ? "Success" : "Failure";
                rollhistmin = "Bonus Roll";
                numrolls++;
            } else if (roll < successat) {
                rollhist = "Normal Roll: Fail";
                rollhistmin = "Fail";
            } else {
                rollhist = "Normal Roll: Success";
                rollhistmin = "Success";
            }

            rolls[rollid] = roll;
            rollsuccess[rollid] = successat;
            rollhistory[rollid] = rollhist;
            rollagains[rollid] = rollagain;
            rollhistorymin[rollid] = rollhistmin;
        }
        for (j = 0; j < extrarolls; j++) {
            var roll = TextParsers.die(10);
            var rollhist = "Extra Roll";
            var rollid = numrolls + j;
            if (roll >= rollagain) {
                //Power gives extra roll
                rollhist = "Again: Extra roll from " + TextParsers.repeatString("!", numagains) + ", " + (roll < successat) ? "Success" : "Failure";
                rollhistmin = "Bonus Roll";
                extrarolls++;
            } else if (roll < successat) {
                rollhist = "Extra Roll: Fail";
                rollhistmin = "Fail";
            } else {
                rollhist = "Extra Roll: Success";
                rollhistmin = "Success";
            }
            rolls[rollid] = roll;
            rollsuccess[rollid] = successat;
            rollhistory[rollid] = rollhist;
            rollagains[rollid] = "X";
            rollhistorymin[rollid] = rollhistmin;
        }

    }
    return {rolls:rolls, rollhistory:rollhistory, rollhistorymin:rollhistorymin, rollsuccess:rollsuccess, rollagains:rollagains, input:input, format:'w'};
};

TextParsers.buildArrayFromStandardDiceRolls = function(input) {
    //Derived from diceroller Github Opensource project
    //Rolls dice pared from normal [3d6] pattern, returns array of results
    if (!input || (input.length < 2)) return input;
    var first = input.charAt(0);
    var last = input.charAt(input.length - 1);
    if (((first == "[") && (last == "]")) || ((first == "(") && (last == ")"))) {
        input = input.substr(1, input.length - 2).trim();
    }

    var dice = input.replace(/- */, '+ -');
    dice = dice.replace(/D/, 'd');
    dice = dice.replace(/S/, 's');
    dice = dice.replace(/^\s*|\s*$/g, '');
    var re = / *\+ */;
    var items = dice.split(re);
    var res = new Array();
    var type = new Array();
    for (var i = 0; i < items.length; i++) {
        var match = items[i].match(/^[ \t]*(-)?(\d+)?(?:(d)(\d+))?[ \t]*$/);
        if (match) {
            var sign = match[1] ? -1 : 1;
            var num = parseInt(match[2] || "1");
            var max = parseInt(match[4] || "0");
            if (match[3]) {
                for (var j = 1; j <= num; j++) {
                    res[res.length] = sign * TextParsers.die(max);
                    type[type.length] = max;
                }
            } else {
                res[res.length] = sign * num;
                type[type.length] = 0;
            }
        }
        else return {"res":[], "type":[]};
    }
    if (res.length == 0) return {res:[], type:[], input:""};
    return {res:res, type:type, input:input, format:'d'};
};

TextParsers.rollTheDice = function(diceType, input, formatType) {
    //Reflexive function applier
    return diceType(input, formatType);
};
TextParsers.randRange = function(min,max){
    var randVal = min+(Math.random() * (max-min));
    return Math.round(randVal);
};
TextParsers.die = function(sides) {
    //Rolls an "n-sided die"
    return TextParsers.randRange(0,sides);
};
TextParsers.pluralizeSuccess = function(num) {
    return (num > 1) ? "successes" : (num == 1) ? "success" : "failure";
};
TextParsers.repeatString = function(str, times) {
    var returnstr = "";
    for (var i = 0; i < times; i++) returnstr += str;
    return returnstr;
};
TextParsers.parsingExpressions = [
    {
        exp: /\[\s*(?:[0-9]+[dD][0-9]+[e]{0,1}\s*[+-]{0,1}\s*[0-9]*(?![dD])[+]{0,1})+\s*\]/ ,
        func: TextParsers.buildResponseStringFromStandardDiceRolls,
        parserName: "Dice Roller",
        format : 'd',
        sampleUsage: "[1d8] or [2d10] or [3d5+7] or [2d10+4+1d4 - 1d10]"
    },
    {
        exp: /\[\s*(\+{0,1}\s*[0-9]+[wW][0-9]*([rR]{0,1}[oOtTeE\?]*|[!])*\s*)+\]|\/roll[\s:=]*\[{0,1}\s*(\+{0,1}\s*[0-9]+[wW][0-9]*([rR]{0,1}[oOtTeE\?]*|[!])*\s*)+\]{0,1}/ ,
        func: TextParsers.buildResponseStringFromNWODRolls,
        parserName: "NWOD Success Calculator",
        format : 'w',
        sampleUsage: "[1w] or [2W!] (reroll 9s not just 10s) or [5wRote] (1st aren't a failure) or /roll 2w or /roll: [ 2w + 4w!]"
    },
    {
        exp: /^(?:[0-9]+[dD][0-9]+[e]{0,1}\s*[+-]{0,1}\s*[0-9]*(?![dD])[+]{0,1})+/ ,
        func: TextParsers.buildResponseStringFromStandardDiceRolls,
        runOnce: true,
        parserName: "Dice Roller",
        format : 'd',
        sampleUsage: "1d8 or 2d10 or 3d5+7 or 2d10+4+1d4 - 1d10"
    },
    {
        exp: /^(\+{0,1}\s*[0-9]+[wW][0-9]*([rR]{0,1}[oOtTeE\?]*|[!])*)+/ ,
        func: TextParsers.buildResponseStringFromNWODRolls,
        runOnce: true,
        parserName: "NWOD Success Calculator",
        format : 'w',
        sampleUsage: "1w or 2W! or 5wRote"
    }
];