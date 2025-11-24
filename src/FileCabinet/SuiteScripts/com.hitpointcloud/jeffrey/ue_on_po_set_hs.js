/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * Author       Jeffrey
 * Date         2023/5/16
 * Task         po含税单价
 */
define(['N/record'],
    /**
 * @param{record} record
 */
    (record) => {
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
            let type = scriptContext.type
            if(type == 'edit' || type == 'create'){
                let curRec = record.load({type:scriptContext.newRecord.type,id:scriptContext.newRecord.id});
                var subsidiary = curRec.getValue("subsidiary");
                if(subsidiary == '22' || subsidiary == '25' || subsidiary == '27' ){
                    let lineCount = curRec.getLineCount("item");
                    for(let index = 0 ; index < lineCount;index ++){
                        let rate = Number(curRec.getSublistValue({sublistId:"item",fieldId:"rate",line:index})||0)
                        log.debug("rate",rate)
                        let rateincludetax = Number(curRec.getSublistValue({sublistId:"item",fieldId:"custcol_chefman_rateincludetax",line:index})||0)
                       log.debug("rateincludetax",rateincludetax)
                        curRec.setSublistValue({sublistId:"item",fieldId:"custcol_chefman_rateincludetax",value:parseFloat(rateincludetax.toFixed(4)),line:index})
                    }
                    curRec.save({enableSourcing:true,ignoreMandatoryFields:true})
                }

            }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
