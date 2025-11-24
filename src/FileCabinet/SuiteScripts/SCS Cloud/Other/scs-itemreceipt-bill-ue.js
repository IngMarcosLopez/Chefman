/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript  
 */
define(['N/record', 'N/search'],

    function(record, search) {


        function beforeLoad(context) {}

        function afterSubmit(context) {
            try {
                //process the logic only one create of the Item Receipt 
                if (context.type == 'create' ) { // || context.type == 'edit'

                    var recordObj = context.newRecord;
                    var recordType = recordObj.type;
                    var recordId = recordObj.id;

                    var itemRecIeptLookUp = search.lookupFields({
                        type: recordType,
                        id: recordId,
                        columns: ['internalid', 'subsidiary', 'custbody_scs_received_as_expected']
                    });
                    log.debug({
                        title: 'itemRecIeptLookUp',
                        details: itemRecIeptLookUp
                    });
                    //process only when the "Received as Expected" checkbox was checked
                    if (itemRecIeptLookUp['custbody_scs_received_as_expected']) {
                        var itemrecieptObj = recordObj;
                        // var itemrecieptObj = record.load({
                        //     type: recordType,
                        //     id: recordId,
                        //     isDynamic: true
                        // });
                        var poId = itemrecieptObj.getValue({
                            fieldId: 'createdfrom'
                        });

                        var billObj = record.transform({
                            fromType: record.Type.PURCHASE_ORDER,
                            fromId: poId,
                            toType: record.Type.VENDOR_BILL,
                            isDynamic: true
                        });
                        billObj.setValue({
                            fieldId: 'tranid',
                            value: 'test bill '+new Date().getHours()+new Date().getMinutes(),
                            ignoreFieldChange: true
                        });
                        billObj.setValue({
                            fieldId: 'trandate',
                            value: itemrecieptObj.getValue({fieldId: 'trandate'}),
                            ignoreFieldChange: true
                        });

                        var irLineCount = itemrecieptObj.getLineCount({
                            sublistId: 'item'
                        });
                        log.debug({
                            title: 'irLineCount',
                            details: irLineCount
                        });
                        var billLineCount = billObj.getLineCount({
                            sublistId: 'item'
                        });
                        log.debug({
                            title: 'billLineCount',
                            details: billLineCount
                        });

                        //iterating through the line items of transformed bill
                        for (var j = billLineCount; j != 0; j--) {

                            var lineFlag = true;
                            var billItem = billObj.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: (j - 1)
                            });

                            var billorderLine = billObj.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'orderline',
                                line: (j - 1)
                            });

                            //iterating through the line items of item receipt 
                            for (var i = 0; i < irLineCount; i++) {
                                var irItem = itemrecieptObj.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: i
                                });

                                var orderLine = itemrecieptObj.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'orderline',
                                    line: i
                                });
                                log.debug({
                                    title: irItem +'=='+ billItem,
                                    details: orderLine +'=='+ billorderLine
                                });
                                //set the quantity only when the item and order line from bill and item receipt matches
                                if ((irItem == billItem) && (orderLine == billorderLine)) {
                                    var irQty = itemrecieptObj.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity',
                                        line: i
                                    });
                                    log.debug({
                                        title: 'irQty',
                                        details: irQty
                                    });
                                    billObj.selectLine({
                                        sublistId: 'item',
                                        line: (j-1)
                                    });
                                    billObj.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity',
                                        value: irQty,
                                        ignoreFieldChange: true
                                    });
                                    billObj.commitLine({
                                        sublistId: 'item',
                                        ignoreRecalc: true
                                    })
                                    // billObj.setSublistValue({
                                    //     sublistId: 'item',
                                    //     fieldId: 'quantity',
                                    //     line: (j - 1),
                                    //     value: irQty
                                    // });
                                    lineFlag = false;
                                    break;
                                }

                            }
                            //remove the line which is not received yet from the bill object
                            if(lineFlag){
                                billObj.removeLine({
                                    sublistId: 'item',
                                    line: (j - 1),
                                    ignoreRecalc: true
                                });
                            }

                        }

                        // log.debug({
                        //     title: 'billObj',
                        //     details: billObj
                        // });
                        var billId = billObj.save({
                            enableSourcing       : true,
                            ignoreMandatoryFields: false
                        });

                        log.debug({
                            title  : 'bill Id',
                            details: billId
                        });
                    }


                }
            } catch (e) {
                log.error({
                    title: 'Error is',
                    details: e
                });
            }

        }

        function beforeSubmit(context) {}

        return {
            //beforeLoad : beforeLoad,
            afterSubmit: afterSubmit
            //beforeSubmit : beforeSubmit
        }
    }
)