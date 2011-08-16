var TextParsers = {
	//Text parsers and dice rollers
    parse: function(text,isFormatted) {
		//Note, when building REs, suggest using: http://regexpal.com/ (and take out the starting and ending / when pasting into page)
		var parsingExpressions = [{
			exp: /(?:[0-9]+[dD][0-9]+[e]{0,1}\s*[+-]{0,1}\s*[0-9]*(?![dD])[+]{0,1})+|\[\s*(?:[0-9]+[dD][0-9]+[e]{0,1}\s*[+-]{0,1}\s*[0-9]*(?![dD])[+]{0,1})+\s*\]/ ,
			func: TextParsers.diceNormalEval,
			parserName: "Dice Roller",
			sampleUsage: "1d8 or [2d10] or 3d5+7 or [2d10+4+1d4 - 1d10]"
		  },{
			exp: /\[\s*(\+{0,1}\s*[0-9]+[wW][0-9]*([rR]{0,1}[oOtTeE]*|[!])*\s*)+\]|\/roll[\s:=]*\[{0,1}\s*(\+{0,1}\s*[0-9]+[wW][0-9]*([rR]{0,1}[oOtTeE]*|[!])*\s*)+\]{0,1}/ ,
			func: TextParsers.diceNWODEval,
			parserName: "NWOD Succes Calculator",
			sampleUsage: "[1w] or [2W!] (reroll 9s not just 10s) or [5wRote] (1st aren't a failure) or /roll 2w or /roll: [ 2w + 4w!]"
		}];

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
					var result_roll = TextParsers.rollTheDice(re.func,dicetext,isFormatted);
					text = text.substr(0,loc) + result_roll + text.substr(loc+dicetext.length);
				} else {
					numEmptyMatches++;
				}
			}
		}
		return text;
	},
	rollTheDice: function(diceType,input,isFormatted) {
		//Reflexive function applier
		return diceType(input,isFormatted);
	},	
	d: function(sides) {
		//Rolls an "n-sided die"
		return Math.ceil(sides*Math.random());
	},
	diceNWODEval: function(input,isFormatted) {
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

		var successes =0;

        var re = / *\+ */;
        var items = input.split(re);
        var rolls = [];
        var rollhistory = [];
        var rollsuccess = [];
        for ( var i=0; i<items.length; i++) {
        	var die=items[i];
        	var wpos = die.indexOf("w");
        	if (wpos<1) break;
        	//TODO: Handle sign
        	var numrolls = parseInt(die.substr(0,wpos) || 1);
        	var options = die.substr(wpos+1) || "";
        	var isrote = options.indexOf("r")>-1;
        	var successat = 8;
        	if (options && (options.length > 0) && (parseInt(options) > 0)) {
        		successat = parseInt(options) || successat;
        	}
        	var rollagain = 10 - options.replace(/[^!]/g, '').length;

			for ( j=1; j<=numrolls; j++) {
				var roll = TextParsers.d(10);
				rolls.push(roll);
				rollhistory[rolls.length-1] = "Normal";
				rollsuccess[rolls.length-1] = successat;
				
				if (isrote && (roll < successat)) {
					roll = TextParsers.d(10);
					var rid = rolls.length-1;
					rolls[rid] = roll;
					rollhistory[rid] = "Rote reroll a 1";
				}
				if (roll >= rollagain) {
					rollhistory[rolls.length] = "Again "+roll;
					rollsuccess[rolls.length] = successat;
					roll = TextParsers.d(10);
					rolls.push(roll);
				}				
			}
		}

		var hstring = "";
		for ( j=0; j<rolls.length; j++) {
			if (rolls[j]>=rollsuccess[j]) successes++;
//Ones don't cancel			if (rolls[j]==1) successes--;
			hstring+= " "+rolls[j]+":"+rollsuccess[j]+rollhistory[j].charAt(0)+",";			
		}
		
		return successes + " ["+input+"="+hstring.substr(0,hstring.length-1)+"]";
//		if (rolls.length == 0) return {"successes":0, "rolls":[], "history":[]};
//		return {"successes":successes, "rolls":rolls, "history":rollhistory};

	},
    diceNormalEval: function(input, isFormatted) {
    //Extra formatting around individual dice rolls
//console.log(isFormatted);

		if (!input || (input.length<2)) return input;
		var first = input.charAt(0);
		var last =  input.charAt(input.length-1);
		if (((first == "[") && (last == "]")) || ((first == "(") && (last == ")"))){
			input = input.substr(1,input.length-2).trim();
		}
 		var response = TextParsers.diceNormalRoller(input);
 		var res = response.res;
 		var type = response.type;
 		
 		//Build the output string
 		var strRet = "";
 		var total = 0;
 		var output = []
        for ( var i=0; i<res.length; i++) {
        	var result = res[i];
        	var dicety = type[i];
        	
        	if (dicety == 0) {
	        	output.push(((result>0)? "+" : "") + result);
        	} else {
	        	output.push(result+"/"+dicety);
	        }
        	total+=result;
        }
		strRet = total + " [" + output.join(", ") + "]";
 		return strRet;
    },
	//Derived from diceroller OS project
    diceNormalRoller: function(dice) {
        var dice = dice.replace(/- */,'+ -');
        var dice = dice.replace(/D/,'d');
        var dice = dice.replace(/S/,'s');
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
        if (res.length == 0) return {"res":[], "type":[]};
        return {"res":res, "type":type};
    }
}
