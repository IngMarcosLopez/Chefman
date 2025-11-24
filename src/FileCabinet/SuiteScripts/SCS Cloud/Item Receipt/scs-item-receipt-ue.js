/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(["N/record", "N/search", "N/query", "N/https", "N/runtime"], function(record, search, query, https, runtime) {

    var OBJ_IR_UE = {};
    OBJ_IR_UE.SUBSIDIARIES_FOR_AUTO_INVOICE = [
        "4", //RJ_BRANDS
        //"7", //CHEF_IQ
        //"8", //CHEFMAN_DIRECT
        //"31", // CHEFMAN_CANADA
        "13", //CHEFMAN_UK
        "30", //Chefman Europe B.V.
    ];
    
    OBJ_IR_UE.APPROVAL_STATUS = {
        APPROVED: 2,
    };

    function beforeLoad(context) {
        // Logic to execute before the record is loaded
    }

    function beforeSubmit(context) {
        // Logic to execute before the record is saved
        try {
            if (context.type != context.UserEventType.DELETE){
                setDefaultFields(context);
            }
        }
        catch (error){
            log.error("Before Submit error", error);
        }
    }

    function afterSubmit(context) {
        // Logic to execute after the record is saved
        try {

            log.debug('afterSubmit', 'context.type: ' + context.type);

            if (context.type == context.UserEventType.CREATE) {
                // Transform the Purchase Order to a Vendor Bill wehn Item Receipt is created
                transformPurchaseOrderToVendorBill(context);
            }

            const TEST_MODE = true;

            if (context.type == context.UserEventType.CREATE || (TEST_MODE && context.type == context.UserEventType.EDIT)) {
                createLandedCostServiceVendorBill(context);
            }

        } catch (error) {
            log.error('afterSubmit', error.toJSON ? error : error.toString());
        }
    }

    function createLandedCostServiceVendorBill (context) {
        try {

            if (runtime.executionContext === runtime.ContextType.SUITELET) {
                return;
            }

            var serviceChargeLandedCostAmount = context.newRecord.getValue('landedcostamount7');

            if (serviceChargeLandedCostAmount) {
                return;
            }

            var irSubsidiaryId = context.newRecord.getValue('subsidiary');

            if (OBJ_IR_UE.SUBSIDIARIES_FOR_AUTO_INVOICE.indexOf(irSubsidiaryId) == -1) {
                return;
            }
            
            var suiteletResponse = https.requestSuitelet({
                scriptId: 'customscript_scs_lc_service_bill_sl',
                deploymentId: 'customdeploy_scs_lc_service_bill_sl',
                method: 'POST',
                body: {
                    ir_id: context.newRecord.id
                }
            });

            log.audit('createLandedCostServiceVendorBill', 'response: ' + suiteletResponse.body);
        }
        catch (error) {
            log.error('transformSalesOrderToInvoice', error);
        }
    }

    function transformPurchaseOrderToVendorBill (context) {
        try {
            // Get the created from id
            const itemReceiptRecord = context.newRecord;

            var irSubsidiaryId = itemReceiptRecord.getValue('subsidiary');

            log.audit("transformPurchaseOrderToVendorBill", "Subsidiary: " + irSubsidiaryId);

            if (OBJ_IR_UE.SUBSIDIARIES_FOR_AUTO_INVOICE.indexOf(irSubsidiaryId) == -1) {
                return;
            }
            const createdFromId = itemReceiptRecord.getValue('createdfrom');
            const createdFromText = itemReceiptRecord.getText('createdfrom');

            log.audit('transformPurchaseOrderToVendorBill', 'Created From: ' + createdFromText);

            // Check if created from text contains Purchase Order
            if (createdFromText.indexOf('Purchase Order') > -1) {

                var poRecord = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: createdFromId
                });

                var poTranId = poRecord.getValue('tranid');
                
                // Transform the Sales Order to an Invoice
                var vendorBillRecord = record.transform({
                    fromType: record.Type.PURCHASE_ORDER,
                    fromId: createdFromId,
                    toType: record.Type.VENDOR_BILL,
                    isDynamic: true
                });

                var vendorBillDocumentNumber = getVendorBillDocumentNumber(poRecord);

                // Set default fields
                vendorBillRecord.setValue({ fieldId: 'approvalstatus', value: OBJ_IR_UE.APPROVAL_STATUS.APPROVED });
                vendorBillRecord.setValue({ fieldId: 'custbody_created_from_item_fulfillment', value: itemReceiptRecord.id });
                vendorBillRecord.setValue({ fieldId: 'tranid', value: vendorBillDocumentNumber });

                /** Vendor Bill Due Date =:
                    If Terms say ETD: PO Ship Date + Terms Days
                    If Terms say ETA: Receive By + Terms Days
                */
                
                var termsId = poRecord.getValue('terms');
                var termsText = poRecord.getText('terms');
                var termsData = getTermsData(termsId);
                var dueDate = new Date();
                var netDays = termsData.daysuntilnetdue;

                if (termsText.indexOf('ETD') > -1 || termsText.indexOf('OA') > -1) {
                    dueDate = new Date(poRecord.getValue('shipdate'));
                    dueDate.setDate(dueDate.getDate() + netDays);
                    vendorBillRecord.setValue({ fieldId: 'duedate', value: dueDate });
                }
                // If contains ETD or Terms = T/T 100% WHEN GOODS ARRIVE IN U
                else if (termsText.indexOf('ETA') > -1 || termsId == 1048) {
                    dueDate = new Date(poRecord.getValue('duedate')); // Receive By
                    dueDate.setDate(dueDate.getDate() + netDays);
                    vendorBillRecord.setValue({ fieldId: 'duedate', value: dueDate });
                }

                log.debug('transformPurchaseOrderToVendorBill', 'Due Date: ' + dueDate);

                // Compare for quantity received and quantity billed
                var vbItemCount = vendorBillRecord.getLineCount({ sublistId: 'item' });
                var irItemCount = itemReceiptRecord.getLineCount({ sublistId: 'item'});

                log.debug('transformPurchaseOrderToVendorBill', 'vbItemCount: ' + vbItemCount + ' irItemCount: ' + irItemCount);

                for (var irIndex = 0; irIndex < irItemCount; irIndex++) {
                    var irItemId = itemReceiptRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: irIndex
                    });
                    var irItemOrderLine = itemReceiptRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'orderline',
                        line: irIndex
                    })
                    var irItemQuantity = itemReceiptRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: irIndex
                    });

                    for (var vbIndex = 0; vbIndex < vbItemCount; vbIndex++) {

                        var vbItemId = vendorBillRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: vbIndex
                        });
                        var vbItemOrderLine = vendorBillRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'orderline',
                            line: vbIndex
                        });
                        var vbItemQuantity = vendorBillRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: vbIndex
                        });

                        log.debug('transformPurchaseOrderToVendorBill', 'irItemId: ' + irItemId + ' vbItemId: ' + vbItemId + ' irItemOrderLine: ' + irItemOrderLine + ' vbItemOrderLine: ' + vbItemOrderLine + ' irItemQuantity: ' + irItemQuantity + ' vbItemQuantity: ' + vbItemQuantity);
                        log.debug('transformPurchaseOrderToVendorBill', 'quantity received: ' + irItemQuantity + ' quantity billed: ' + vbItemQuantity);
                        if (irItemId == vbItemId && irItemOrderLine == vbItemOrderLine) {
                            vendorBillRecord.selectLine({
                                sublistId: 'item',
                                line: vbIndex
                            });
                            vendorBillRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: irItemQuantity
                            });
                            vendorBillRecord.commitLine({
                                sublistId: 'item'
                            });
                        }
                    }
                }

                var vendorBillId = vendorBillRecord.save({
                    ignoreMandatoryFields: true
                });

                log.audit('transformPurchaseOrderToVendorBill', 'Vendor Bill created: ' + vendorBillId);
                
            }
        }
        catch (error) {
            log.error('transformPurchaseOrderToVendorBill', error);
        }
    }

    /**
     * Run a SuiteQL query to get the terms data.
     * 
     * @param {*} termsId 
     */
    function getTermsData (termsId) {
        var queryString = `
            SELECT  
                t.name,
                t.discountPercent,
                t.dayDiscountExpires,
                t.daysUntilExpiry,
                t.daysUntilNetDue

            FROM term t

            WHERE t.id = ${termsId}
        `;

        log.debug("Querying for termsId", queryString);

        const results = query.runSuiteQL(queryString).asMappedResults();

        log.debug('termsData', JSON.stringify(results));

        if (results.length > 0) {
            return results[0];
        }
        else {
            return null;
        }
    }

    function getVendorBillDocumentNumber (purchaseOrderRecord) {
        var stLogTitle = "getVendorBillDocumentNumber: ";
        log.audit(stLogTitle + "START");

        var purchaseOrderId = purchaseOrderRecord.id;
        var vendorBillDocumentNumber = purchaseOrderRecord.getValue({ fieldId: "custbody_oodle_order_number" });

        var vendorBillCount = getVendorBillCount(purchaseOrderId);
        log.audit(stLogTitle + "vendorBillCount", vendorBillCount);

        if (vendorBillCount != 0) {
            vendorBillDocumentNumber += "-";
            vendorBillDocumentNumber += String(vendorBillCount);
            log.audit(stLogTitle + "vendorBillDocumentNumber", vendorBillDocumentNumber);
        }
        

        log.audit(stLogTitle + "COMPLETE " + vendorBillDocumentNumber + " - " + vendorBillCount);

        return vendorBillDocumentNumber;
    };

    function getVendorBillCount (purchaseOrderId) {
        var stLogTitle = "getVendorBillCount: ";
        try {
            var vendorBillCount = 0;
            var searchObject = search.create({
                type: "transaction",
                filters:
                [
                    ["internalid","anyof",purchaseOrderId], 
                    "AND", 
                    ["applyingtransaction.type","anyof","VendBill"]
                ],
                columns:
                [
                    search.createColumn({
                        name: "internalid",
                        join: "applyingTransaction",
                        summary: "COUNT",
                        label: "Internal ID",
                        sort: search.Sort.ASC
                    })
                ]
            });

            var searchResults = getAllSearchResult(searchObject);

            if (searchResults.length > 0) {
                vendorBillCount = searchResults[0].getValue({ name: "internalid", join: "applyingTransaction", summary: "COUNT" });
            }

            log.debug("searchObject VB result count", vendorBillCount);

            return vendorBillCount;
        } catch (error) {
            log.error(stLogTitle + "ERROR", error);
        }
    };

    function setDefaultFields (context) {
        try {
            if (context.type == context.UserEventType.CREATE) {
                // Unset Landed Cost by Line checkbox
                context.newRecord.setValue({
                    fieldId: 'landedcostperline',
                    value: false
                });
            }
            
        }
        catch (error) {
            log.error("Set Default Fields error", error);
        }
        
    }

    function getAllSearchResult(searchObject) {
        var pages = searchObject.runPaged({ pageSize: 1000 });
        var result = [];
        for (var pageIndex = 0; pageIndex < pages.pageRanges.length; pageIndex += 1) {
            var singlePage = pages.fetch({ index: pageIndex });
            for (var lineIndex = 0; lineIndex < singlePage.data.length; lineIndex += 1) {
                result.push(singlePage.data[lineIndex]);
            }
        }
        return result;
    }


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});