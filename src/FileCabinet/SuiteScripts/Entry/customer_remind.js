/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/dialog'],
/**
 * @param{dialog} dialog
 */
function(dialog) {
    function myScript() {
        var message = "remind";
        dialog.alert({
            title: "netsuite style",
            message:message
    });
    }
    function pageInit(myScript) {
    }

    return {
        pageInit: pageInit,
    };  
});