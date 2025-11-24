/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(["N/currentRecord"], function(currentRecord) {

    const MINIMUM_AMOUNT = 5000;
    const minAmountMessage = 'This form is to be used specifically for approvals over $5,000. Please contact your manager directly for approval on your requested spend.';

    function saveRecord(context) {
        // Validate the form before submitting
        return validateRequestAmount(context);

    }

    function validateRequestAmount (context) {
        var formRecord = currentRecord.get();
        var requestAmount = formRecord.getValue('custpage_expense_amount');

        if (requestAmount < MINIMUM_AMOUNT) {
            alert(minAmountMessage);
            return false;
        }
        else {
            return true;
        }
    }

    return {
        saveRecord: saveRecord
    };
});
