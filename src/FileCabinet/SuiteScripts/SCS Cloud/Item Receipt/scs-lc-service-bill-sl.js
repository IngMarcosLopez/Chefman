/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/log', 'N/search'], 
function(record, log, search) {

    const LANDED_COST_CATEGORY = {
        SERVICE_CHARGE: 7,
    };


    var SERVICE_VENDOR_DATA = {
        SERVICE_FEE_ITEM: 106804,
        serviceVendorId: null, 
        serviceFeeSplit: null,
        serviceFeeAmount: null
    };

    function onRequest(context) {
        try {
            if (context.request.method === 'POST') {
                var irId = context.request.parameters.ir_id;
                if (irId) {
                    var itemReceiptRecord = record.load({
                        type: record.Type.ITEM_RECEIPT,
                        id: irId
                    });
                    getServiceVendorData(itemReceiptRecord);
                    var totalValue = getItemReceiptTotalValue(itemReceiptRecord);
                    getServiceFeeAmount(totalValue);

                    log.audit('onRequest SERVICE_VENDOR_DATA', JSON.stringify(SERVICE_VENDOR_DATA));

                    var vendorBillId = createVendorBill(itemReceiptRecord);
                    if (!vendorBillId) {
                        throw 'Vendor Bill creation failed';
                    }

                    assignVendorBillToItemReceipt(itemReceiptRecord, vendorBillId);
                }
            }
        }
        catch (error) {
            log.error('onRequest', error);
        }   
        
    }

    // Get the Service Vendor Data (vendor id and split %)
    function getServiceVendorData(itemReceiptRecord) {
        // Get the Vendor fields (vendor id and split %) from the Item receipt record's vendor
        var vendorId = itemReceiptRecord.getValue('entity');
        var vendorFields = search.lookupFields({
            type: search.Type.VENDOR,
            id: vendorId,
            columns: ['custentity_associated_service_vendor', 'custentity_service_fee_split']
        });

        log.debug('getServiceVendorData for Vendor ID ' + vendorId, vendorFields);

        // Return the Service Vendor Data object
        if (vendorFields.custentity_associated_service_vendor && typeof vendorFields.custentity_associated_service_vendor[0] != "undefined") {
            SERVICE_VENDOR_DATA.serviceVendorId = vendorFields.custentity_associated_service_vendor[0].value;
        }

        if (vendorFields.custentity_service_fee_split) {
            SERVICE_VENDOR_DATA.serviceFeeSplit = vendorFields.custentity_service_fee_split;
        }

        //log.debug('getServiceVendorData SERVICE_VENDOR_DATA', JSON.stringify(SERVICE_VENDOR_DATA));
    }


    // Get the Item Receipt's total value (quantity * item rate)
    function getItemReceiptTotalValue(itemReceiptRecord) {
        var lineCount = itemReceiptRecord.getLineCount({ sublistId: 'item' });
        var totalValue = 0;
        for (var lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            var isReceive = itemReceiptRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'itemreceive',
                line: lineIndex
            });

            if (!isReceive) {
                continue;
            }

            var quantity = itemReceiptRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: lineIndex
            });

            var rate = itemReceiptRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: lineIndex
            });

            //log.debug('getItemReceiptTotalValue', 'Quantity: ' + quantity + ' Rate: ' + rate);

            totalValue += quantity * rate;
        }

        log.debug('getItemReceiptTotalValue', 'Total Value: ' + totalValue);

        return totalValue;
    }

    function getServiceFeeAmount(totalValue) {

        var productVendorSplit = parseFloat(SERVICE_VENDOR_DATA.serviceFeeSplit) / 100 || 0;
        var serviceVendorSplit = 1 - productVendorSplit;

        log.debug('getServiceFeeAmount', 'Product Vendor Split: ' + productVendorSplit);
        log.debug('getServiceFeeAmount', 'Service Vendor Split: ' + serviceVendorSplit);

        SERVICE_VENDOR_DATA.serviceFeeAmount = totalValue * productVendorSplit / serviceVendorSplit;
    }


    // Create a Vendor Bill with the Service Fee Item and the Service Vendor Data in approved status
    // Item must be the Service Fee Item and Landed Cost category set to Service
    function createVendorBill(itemReceiptRecord) {

        try {
            if (!SERVICE_VENDOR_DATA.serviceVendorId || !SERVICE_VENDOR_DATA.serviceFeeAmount) {
                throw 'Service Vendor ID or Service Fee Amount is missing';
            }


            
            // Create the Vendor Bill record
            var vendorBillRecord = record.create({
                type: record.Type.VENDOR_BILL,
                isDynamic: true
            });
    
            vendorBillRecord.setValue({ fieldId: 'entity', value: SERVICE_VENDOR_DATA.serviceVendorId });
            // Set the Vendor Bill's fields - approved
            vendorBillRecord.setValue({ fieldId: 'approvalstatus', value: 2 });
    
            // Set Tran ID
            var tranIdText = itemReceiptRecord.getText({ fieldId: 'custbody_oodle_order_number' });
            // Get the number of SC Vendor Bills created from the PO
            var vbCount = getServiceVendorBillCountforPO(tranIdText);

            tranIdText = tranIdText.substring(tranIdText.indexOf("#") + 1);
            tranIdText += 'SC';

            if (vbCount > 0) {
                tranIdText += '-';
                tranIdText += vbCount;
            }
            
            vendorBillRecord.setValue({ fieldId: 'tranid', value: tranIdText });

            // Set Subsidiary
            var subsidiary = itemReceiptRecord.getValue({ fieldId: 'subsidiary' });
            vendorBillRecord.setValue({ fieldId: 'subsidiary', value: subsidiary });

            // Set Created From 
            vendorBillRecord.setValue({ fieldId: 'custbody_created_from_item_fulfillment', value: itemReceiptRecord.id });
    
            // Set the Vendor Bill's line items
            vendorBillRecord.selectNewLine({ sublistId: 'item' });
            vendorBillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: SERVICE_VENDOR_DATA.SERVICE_FEE_ITEM });
            vendorBillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
            vendorBillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: SERVICE_VENDOR_DATA.serviceFeeAmount });
            vendorBillRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'landedcostcategory', value: LANDED_COST_CATEGORY.SERVICE_CHARGE });
            vendorBillRecord.commitLine({ sublistId: 'item' });
    
            // Submit the Vendor Bill record
            var vendorBillId = vendorBillRecord.save({
                ignoreMandatoryFields: true
            });
    
            log.debug('createVendorBill', 'Vendor Bill created: ' + vendorBillId);
    
            return vendorBillId;
        }
        catch (error) {
            log.error('createVendorBill', error);
        }
    }

    function getServiceVendorBillCountforPO (documentNumber) {
        try {

            var formulaDocNumber = `formulanumeric: CASE WHEN INSTR({tranid}, '${documentNumber}SC') > 0 THEN 1 ELSE 0 END`;

            var vendorbillSearchObj = search.create({
                type: "vendorbill",
                filters:
                [
                   ["type","anyof","VendBill"], 
                   "AND", 
                   [formulaDocNumber,"equalto","1"], 
                   "AND", 
                   ["mainline","is","T"]
                ],
                columns:
                [
                   search.createColumn({
                      name: "internalid",
                      summary: "COUNT",
                      label: "Internal ID"
                   })
                ]
            });
            
            var searchResultCount = vendorbillSearchObj.runPaged().count;
            log.debug("vendorbillSearchObj result count",searchResultCount);
            
            var searchResults = vendorbillSearchObj.run().getRange({start: 0, end: 1});

            var vbCount = 0;

            if (searchResults.length > 0) {
                vbCount = parseInt(searchResults[0].getValue({ name: 'internalid', summary: 'COUNT' })) || 0;
            }

            log.debug('getServiceVendorBillCountforPO', 'Vendor Bill Count: ' + vbCount);

            return vbCount;
        }
        catch (error) {
            log.error('getVBCountforPO', error);
        }
    }

    // Assign the Vendor Bill to the Item Receipt (experimental)
    function assignVendorBillToItemReceipt(itemReceiptRecord, vendorBillId) {
        // Set the Vendor Bill field in the Item Receipt record
        itemReceiptRecord.setValue({ fieldId: 'landedcostmethod', value: 'VALUE' });
        itemReceiptRecord.setValue({ fieldId: 'landedcostsource7', value: 'OTHTRAN' });
        itemReceiptRecord.setValue({ fieldId: 'landedcostsourcetran7', value: vendorBillId });
        itemReceiptRecord.setValue({ fieldId: 'landedcostamount7', value: SERVICE_VENDOR_DATA.serviceFeeAmount });
        // Submit the Item Receipt record
        itemReceiptRecord.save({
            ignoreMandatoryFields: true
        });

        log.debug('assignVendorBillToItemReceipt', 'Vendor Bill assigned to Item Receipt: ' + vendorBillId);
    }


    return {
        onRequest: onRequest
    };
});