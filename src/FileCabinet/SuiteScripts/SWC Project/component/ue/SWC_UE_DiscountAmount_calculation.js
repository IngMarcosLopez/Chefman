/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope public
 */
define(['N/record', '../../lib/decimal.js'],

    (record, decimal) => {
        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {
                if (scriptContext.type == "delete") return;
                let newRecord = scriptContext.newRecord;
                let discountRate;
                let discountRateText;
                discountRateText  = newRecord.getValue({fieldId: "discountrate"});//折扣
                log.audit("getValue11",discountRateText);

                try {
                    discountRate  = newRecord.getText({fieldId: "discountrate"});//折扣
                    log.audit("getText",discountRate);
                } catch (e) {
                    log.audit("e--26",e.message);
                    discountRate  = newRecord.getValue({fieldId: "discountrate"});//折扣
                    log.audit("getValue",discountRate);
                }
                let subTotal = newRecord.getValue({fieldId: "subtotal"});//小计
                let discountAmount = "";
                if (!isEmpty(discountRate) && discountRate.toString().indexOf("%") != -1){
                    discountAmount = discountRate;
                }else if (!isEmpty(discountRate) && !isEmpty(subTotal)) {
                    let amountFloat = decimal(Number(discountRate)).div(Number(subTotal)).toNumber();
                    if (amountFloat > 0){
                        amountFloat = decimal(0).sub(Number(amountFloat)).toNumber();
                    }else {
                        amountFloat = Math.abs(amountFloat);
                    }
                    discountAmount = decimal(Number(amountFloat)).mul(100).toNumber().toFixed(2) + "%";
                }
                // record.submitFields({
                //     type: newRecord.type,
                //     id: newRecord.id,
                //     values: {
                //         "custbody_swc_discount_rate": discountAmount
                //     },
                //     options: {
                //         enableSourcing: false,
                //         ignoreMandatoryFields: true
                //     }
                // });
            } catch (e) {
                log.audit("e", e.message);
            }
        }

        /**
         * 非空判断
         * @param obj 各种类型
         * @returns {boolean}
         */
        function isEmpty(obj) {
            if (obj === undefined || obj == null || obj === '') {
                return true;
            }
            if (obj.length && obj.length > 0) {
                return false;
            }
            if (obj.length === 0) {
                return true;
            }
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) {
                    return false;
                }
            }
            if (typeof (obj) == 'boolean') {
                return false;
            }
            if (typeof (obj) == 'number') {
                return false;
            }
            return true;
        }


        return {beforeSubmit}

    });
