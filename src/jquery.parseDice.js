$(document).ready(function() {
    (function ($) {
        $.fn.parseDice = function(changeDisplayTo) {
            return this.each(function() {
                var renderMode = changeDisplayTo || 'shorthtml';
                var isThisNew = (typeof $(this).data('currentRenderMode') === 'undefined');
                var changed = false;
                var objDice;
                var input, rolls;

                var type = $(this).attr('type');  //Make this work for any dice type
                if (type && type.toLowerCase() == 'nwod') {
                    rolls = [];
                    var rollhistory = [];
                    var rollhistorymin = [];
                    var rollsuccess = [];
                    var rollagains = [];

                    input = $(this).attr('text');
                    $(this).find('roll').each(function() {
                        rolls.push($(this).attr('value'));
                        rollhistorymin.push($(this).attr('detail') || "Roll");
                        rollhistory.push($(this).attr('detaillong') || $(this).attr('detail') || "Roll"); //TODO, should we just have RH? instead of the min?
                        rollsuccess.push($(this).attr('successat') || 8);
                        rollagains.push($(this).attr('againat') || 10);
                    });

                    objDice = {rolls:rolls, rollhistory:rollhistory, rollhistorymin:rollhistorymin, rollsuccess:rollsuccess, rollagains:rollagains, input:input};
                    changed = true;
                }
                if (type && type.toLowerCase() == 'd') {
                    rolls = [];
                    var dtypes = [];

                    input = $(this).attr('text');
                    $(this).find('roll,mod').each(function() {
                        rolls.push($(this).attr('value'));
                        if ($(this)[0].localName == 'roll') {
                            dtypes.push($(this).attr('die'));
                        } else {
                            dtypes.push(0);
                        }
                    });

                    objDice = {res:rolls, type:dtypes, input:input};
                    changed = true;
                }
                if (changed) {
                    $(this).find('text')[0].innerHTML = TextParsers.buildStringFromXML(objDice, type, renderMode);
                    $(this).data('currentRenderMode', renderMode);
                    $(this).css('cursor', 'pointer');
                    $(this).css('display','inline');
                }

                if (isThisNew) {
                    $(this).click(function() {
                        var currentDisplayMode = $(this).data('currentRenderMode');
                        var newDisplayMode = 'shorthtml';
                        switch (currentDisplayMode) {
                            case 'shorthtml':
                                newDisplayMode = 'longhtml';
                                break;
                            case 'longhtml':
                                newDisplayMode = (type == 'd')? 'shorthtml' : 'fullhtml';
                                break;
                            case 'fullhtml':
                                newDisplayMode = 'shorthtml';
                                break;
                        }
                        $(this).css('display','inline');
                        $(this).parseDice(newDisplayMode);
                    });
                }
            });
        };
    })(jQuery);
});