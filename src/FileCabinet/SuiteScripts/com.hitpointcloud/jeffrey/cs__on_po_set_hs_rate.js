/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * Author       Eli
 * Date         2023/5/16
 * Task         po含税单价
 */
define(['N/currentRecord', 'N/record', './utils_func.js'],
    function(currentRecord, record, func) {
    
        function fieldChanged(scriptContext) {
            var fieldId = scriptContext.fieldId;
            var sublistId = scriptContext.sublistId;
            var curRec = scriptContext.currentRecord;
            var subsidiary = curRec.getValue("subsidiary");
    
            if ((subsidiary === '22' || subsidiary === '25') && sublistId === 'item') {
                if (fieldId === 'taxrate1') {
                    updateTaxIncludedRate(curRec, sublistId);
                }
            }
        }
    
        function updateTaxIncludedRate(curRec, sublistId) {
            var taxRate = func.accDiv(curRec.getCurrentSublistValue({ sublistId: sublistId, fieldId: "taxrate1" }), 100);
            var rate = curRec.getCurrentSublistValue({ sublistId: sublistId, fieldId: "rate" });
            var taxIncludedRate = func.accMul(rate, func.accAdd(1, taxRate)).toFixed(4);
    
            curRec.setCurrentSublistValue({
                sublistId: sublistId,
                fieldId: "custcol_chefman_rateincludetax",
                value: taxIncludedRate
            });
        }
    
        function validateLine(scriptContext) {
            var curRec = scriptContext.currentRecord;
            var subsidiary = curRec.getValue("subsidiary");
    
            if (subsidiary === '22' || subsidiary === '25') {
                var rateIncludedTax = Number(curRec.getCurrentSublistValue({ sublistId: "item", fieldId: "custcol_chefman_rateincludetax" }) || 0);
                var taxRate = func.accDiv(curRec.getCurrentSublistValue({ sublistId: "item", fieldId: "taxrate1" }), 100);
                var rate = func.accDiv(rateIncludedTax, func.accAdd(1, taxRate)).toFixed(8);
    
                curRec.setCurrentSublistValue({ sublistId: "item", fieldId: "rate", value: rate });
                curRec.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_chefman_rateincludetax", value: rateIncludedTax.toFixed(4) });
            }
    
            return true;
        }
    
        return {
            fieldChanged: fieldChanged,
            validateLine: validateLine
        };
    });