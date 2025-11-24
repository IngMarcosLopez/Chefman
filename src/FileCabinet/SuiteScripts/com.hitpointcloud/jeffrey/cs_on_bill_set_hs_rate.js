/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * Author       Jeffrey
 * Date         2023/5/16
 * Task         bill含税单价
 */
define(['N/currentRecord', 'N/record','./utils_func.js'],
/**
 * @param{currentRecord} currentRecord
 * @param{record} record
 */
function(currentRecord, record,func) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {

    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        var fieldId = scriptContext.fieldId;
        var sublistId = scriptContext.sublistId;
        var curRec = scriptContext.currentRecord;
        var subsidiary = curRec.getValue("subsidiary");
        if(subsidiary == '22' || subsidiary == '25' || subsidiary == '27' ){
            if(sublistId == 'item' && fieldId == 'taxrate1'){
                var taxrate1 = func.accDiv(curRec.getCurrentSublistValue({sublistId:sublistId,fieldId:"taxrate1"}),100);
                console.log("taxrate1",taxrate1)
                var rate = curRec.getCurrentSublistValue({sublistId:sublistId,fieldId:"rate"});
                console.log("hs",func.accMul(rate,func.accAdd(1,taxrate1)).toFixed(4))
                curRec.setCurrentSublistValue({sublistId:sublistId,fieldId:"custcol_chefman_rateincludetax",value:func.accMul(rate,func.accAdd(1,taxrate1)).toFixed(4)})
            }
        }


    }


    function validateLine(scriptContext) {
        var curRec = scriptContext.currentRecord;
        var subsidiary = curRec.getValue("subsidiary");
        if(subsidiary == '22' || subsidiary == '25' || subsidiary == '27' ){
            var rateincludetax = Number(curRec.getCurrentSublistValue({sublistId:"item",fieldId:"custcol_chefman_rateincludetax"})||0)
            var taxrate1 = func.accDiv(curRec.getCurrentSublistValue({sublistId:"item",fieldId:"taxrate1"}),100);
            curRec.setCurrentSublistValue({sublistId:"item",fieldId:"rate",value:func.accDiv(rateincludetax,func.accAdd(1,taxrate1))})
            curRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_chefman_rateincludetax",value:rateincludetax.toFixed(4)})

        }

        return true

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

    }

    return {
       // pageInit: pageInit,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // sublistChanged: sublistChanged,
        // lineInit: lineInit,
        // validateField: validateField,
         validateLine: validateLine,
        // validateInsert: validateInsert,
        // validateDelete: validateDelete,
        // saveRecord: saveRecord
    };
    
});
