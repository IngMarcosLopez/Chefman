/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

    function () {

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {
            console.log("Sublist Changed Triggered");    //如果方法被调用，则显示控制台日志
           
            //输出sublist changed对应的操作名称,比如提交/删除/插入等操作名称
            var currentRecord = scriptContext.currentRecord;
            var strOperation = scriptContext.strOperation;
            console.log("Operation is", strOperation);

            //将total值赋值到memo中，并显示操作"operation"
            currentRecord.setValue({
                fieldId:'memo',
                value:'Total change to' + currentRecord.getValue({ fieldId:'total'}) + 'witn operation' + strOperation
            });
        }


        return {
            //pageInit: pageInit,
            //fieldChanged: fieldChanged,
            //postSourcing: postSourcing,
            sublistChanged: sublistChanged,
            //lineInit: lineInit,
            //validateField: validateField,
            //validateLine: validateLine,
            //validateInsert: validateInsert,
            //validateDelete: validateDelete,
            //saveRecord: saveRecord
        };

    });
