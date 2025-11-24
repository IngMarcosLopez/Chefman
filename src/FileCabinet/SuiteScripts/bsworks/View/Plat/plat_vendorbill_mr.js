/**
 * 供应商对账 map/reduce脚本
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define(['N/record', 'N/runtime'],
    (record, runtime) => {
        const getInputData = (context) => {
            var reduceParams = runtime.getCurrentScript().getParameter({ name: "custscript_bsw_plat_vendorbill_params" });
            reduceParams = JSON.parse(reduceParams);
            var itemreceiptObj = reduceParams.itemreceiptObj;
            return itemreceiptObj;
        }

        const map = (context) => {
            try {
                var key = context.key;
                var itemreceiptitemList = JSON.parse(context.value);
                var itemreceiptRecord = record.load({ type: "itemreceipt", id: key });
                var numLines = itemreceiptRecord.getLineCount({ sublistId: "item" });
                for (var i = 0; i < numLines; i++) {
                    var line = itemreceiptRecord.getSublistValue({ sublistId: "item", fieldId: "orderline", line: i });
                    for (var p = 0; p < itemreceiptitemList.length; p++) {
                        var itemreceiptitem = itemreceiptitemList[p];
                        if (line == itemreceiptitem.line) {
                            var custcol_ir_bill_qty = itemreceiptitem.custcol_ir_bill_qty;
                            if (null != itemreceiptitem.sourceFlag && "deleteVendorbill" == itemreceiptitem.sourceFlag) {
                                var source_bill_qty = itemreceiptRecord.getSublistValue({ sublistId: "item", fieldId: "custcol_ir_bill_qty", line: i });
                                custcol_ir_bill_qty = (parseFloat(source_bill_qty) || 0) - (parseFloat(custcol_ir_bill_qty) || 0);
                                if (parseFloat(custcol_ir_bill_qty) < 0) custcol_ir_bill_qty = 0;
                            }
                            itemreceiptRecord.setSublistValue({ sublistId: "item", fieldId: "custcol_ir_bill_qty", line: i, value: custcol_ir_bill_qty });
                            break;
                        }
                    }
                }
                itemreceiptRecord.save();
            } catch (e) {
                log.error("reduce-map", e);
            }
        }


        const reduce = (context) => {
            log.debug('reduce', JSON.stringify(context));
        }

        const summarize = (context) => {
            if (context.mapSummary.errors) {
                context.mapSummary.errors.iterator().each(function (key, value) {
                    log.error(key, value);
                    return true;
                });
            }
        }

        return { getInputData, map, summarize }
    })