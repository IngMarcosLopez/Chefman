/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget','N/record',"N/url"],
    /**
 * @param{currentRecord} currentRecord
 * @param{record} record
 * @param{serverWidget} serverWidget
 */
    ( serverWidget, record,url) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            var f = scriptContext.form;
            var newRec = scriptContext.newRecord;
            if(scriptContext.type == 'view') {
                var soRec = record.load({type:"salesorder",id:scriptContext.newRecord.id});
                var statusRef  = soRec.getValue({fieldId:'statusRef'});// so状态
                var subsidiary  = soRec.getValue({fieldId:'subsidiary'});// so状态
                if(statusRef == "pendingFulfillment" || statusRef == "partiallyFulfilled" || statusRef == "pendingBillingPartFulfilled" ) {
                    // f.clientScriptModulePath = "../cs/SWC_CS_tallyStorage";
                    var url_to1=url.resolveScript({
                        scriptId: 'customscript_swc_sl_transferpo',
                        deploymentId: 'customdeploy_swc_sl_transferpo'
                    });
                    // 跳转SL
                    var buttonfunc= "window.open('" + url_to1+ "&recid="+ scriptContext.newRecord.id+ "&subsidiary="+ subsidiary+"', '_block', '');";

                    f.addButton({
                        id: 'custpage_transferpo',
                        label: 'Transform Purchase Order',
                        //触发点击事件的方法名称
                        functionName: buttonfunc
                    });
                }
            }
            // 复制so将po quantity清除
            if(scriptContext.type == 'copy') {
                var count = newRec.getLineCount({sublistId:"item"});
                for (var i = 0; i < count; i++) {
                    newRec.setSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity",line:i,value:""});
                }
            }
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {




        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
