/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/record'], function(record) {

    var OBJ_IF_SL = {};
    OBJ_IF_SL.SUBSIDIARIES_FOR_AUTO_INVOICE = [
        "4", //RJ_BRANDS
        //"7", //CHEF_IQ
        //"8", //CHEFMAN_DIRECT
        //"31", // CHEFMAN_CANADA
        "13", //CHEFMAN_UK
        "30", //Chefman Europe B.V.
    ];

    OBJ_IF_SL.APPROVAL_STATUS = {
        APPROVED: 2,
    };

    function onRequest(context) {
        // Add your code here
        try {

            if (context.request.method === 'POST') {
                var ifId = context.request.parameters.if_id;
                transformSalesOrderToInvoice(ifId);
            }
        }
        catch (error) {
            log.error('onRequest', error);
        }
    }

    function transformSalesOrderToInvoice(ifId) {
        try {
            
            // Get the created from id
            const itemFulfillmentRecord = record.load({
                type: record.Type.ITEM_FULFILLMENT,
                id: ifId
            });

            var ifSubsidiaryId = itemFulfillmentRecord.getValue('subsidiary');

            log.audit("transformSalesOrderToInvoice", "Subsidiary: " + ifSubsidiaryId);

            if (OBJ_IF_SL.SUBSIDIARIES_FOR_AUTO_INVOICE.indexOf(ifSubsidiaryId) == -1) {
                return;
            }
            const createdFromId = itemFulfillmentRecord.getValue('createdfrom');
            const createdFromText = itemFulfillmentRecord.getText('createdfrom');

            log.audit('transformSalesOrderToInvoice', 'Created From: ' + createdFromText);

            // Check if created from text contains Sales Order
            if (createdFromText.indexOf('Sales Order') > -1) {

                // Get the Sales Order status
                const salesOrderStatus = itemFulfillmentRecord.getValue('shipstatus');

                log.audit('transformSalesOrderToInvoice', 'Sales Order Status: ' + salesOrderStatus)

                // Check if the Sales Order status is Shipped
                if (salesOrderStatus == 'C') {
                    // Transform the Sales Order to an Invoice
                    var invoiceRecord = record.transform({
                        fromType: record.Type.SALES_ORDER,
                        fromId: createdFromId,
                        toType: record.Type.INVOICE,
                        isDynamic: true
                    });

                    var shippingPlanNumber = itemFulfillmentRecord.getValue('custbody_scs_ship_plan_number');
                    var thirdPartyInvoiceNumber = itemFulfillmentRecord.getValue('custbody_scs_third_party_invoice_num');
                    var bolNumber = itemFulfillmentRecord.getValue('custbody_chefman_bol_num');
                    var scac = itemFulfillmentRecord.getValue('custbody_chefman_scac');
                    var locationId = itemFulfillmentRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        line: 0
                    });

                    // Set default fields
                    invoiceRecord.setValue({ fieldId: 'approvalstatus', value: OBJ_IF_SL.APPROVAL_STATUS.APPROVED });
                    invoiceRecord.setValue({ fieldId: 'custbody_created_from_item_fulfillment', value: itemFulfillmentRecord.id });
                    invoiceRecord.setValue({ fieldId: 'custbody_scs_ship_plan_number', value: shippingPlanNumber });
                    invoiceRecord.setValue({ fieldId: 'custbody_chefman_bol_num', value: bolNumber });
                    invoiceRecord.setValue({ fieldId: 'custbody_chefman_scac', value: scac });
                    invoiceRecord.setValue({ fieldId: 'location', value: locationId });

                    if (thirdPartyInvoiceNumber) {
                        invoiceRecord.setValue({ fieldId: 'tranid', value: thirdPartyInvoiceNumber });
                    }

                    // Set the total numbner of line items
                    setNumberLineItems(invoiceRecord);

                    var invoiceId = invoiceRecord.save({
                        ignoreMandatoryFields: true
                    });

                    log.audit('transformSalesOrderToInvoice', 'Invoice created: ' + invoiceId);
                }
            }
        } catch (error) {
            log.error('transformSalesOrderToInvoice', error);
        }
    }

    /**
         * Calculates the number of distinct line items on the Invoice.
         * This field is used for PDF printing.
         * custbody_scs_number_line_items
         * 
         * @param {*} invoiceRecord 
    */
    function setNumberLineItems (invoiceRecord) {
        try {
            // For each line item, check if it is an inventory item. If it is, increment the count.
            var inventoryLineCount = 0;

            var lineCount = invoiceRecord.getLineCount({ sublistId: 'item' });

            for (var i = 0; i < lineCount; i++) {
                var itemType = invoiceRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });

                if (itemType == 'InvtPart') {
                    inventoryLineCount++;
                }
            }
            invoiceRecord.setValue({ fieldId: 'custbody_scs_number_line_items', value: inventoryLineCount });
        }
        catch (error) {
            log.error('setNumberLineItems', error);
        }
    } 

    return {
        onRequest: onRequest
    };
});