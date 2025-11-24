/**
 * 供应商账单 用户事件
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 */

define(["../../Util/bsworksUtil.min", "N/record", "N/task"], function (bsworksUtil, record, task) {

    function afterSubmit(context) {
        if (context.type == "delete") {
            var recordObj = context.oldRecord;
            //删除供应商账单，修改对应的入库单已开票金额
            try {
                var itemreceiptObj = {}; //待处理入库单数据
                var billLines = recordObj.getLineCount({ sublistId: "item" });
                for (var line = 0; line < billLines; line++) {
                    var sourcedocFlag = recordObj.getSublistValue({ sublistId: "item", fieldId: "custcol_chefman_sourcedoc_flag", line: line });
                    if (bsworksUtil.isNullOrEmpty(sourcedocFlag)) continue;
                    if (sourcedocFlag.indexOf("itemreceipt#") == -1) continue;
                    sourcedocFlag = sourcedocFlag.replace("itemreceipt#", "");
                    var sourceDocSplit = sourcedocFlag.split("###");
                    for (var s = 0; s < sourceDocSplit.length; s++) {
                        var sourceDocArr = sourceDocSplit[s].split("#");
                        var itemreceiptItem = { custcol_ir_bill_qty: sourceDocArr[1], line: sourceDocArr[2], sourceFlag: "deleteVendorbill" };
                        if (itemreceiptObj[sourceDocArr[0]] == null) {
                            itemreceiptObj[sourceDocArr[0]] = [itemreceiptItem];
                        } else {
                            itemreceiptObj[sourceDocArr[0]].push(itemreceiptItem);
                        }
                    }

                }
                //处理需要反填已开票数量字段值的记录
                if (Object.keys(itemreceiptObj).length > 10) {
                    //创建任务
                    var reduceParams = { itemreceiptObj: itemreceiptObj };
                    var reduceTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_bsw_plat_vendorbill_mr",
                        deploymentId: "customdeploy_bsw_plat_vendorbill_mr",
                        params: { custscript_bsw_plat_vendorbill_params: reduceParams }
                    });
                    reduceTask.submit();

                } else {
                    for (var key in itemreceiptObj) {
                        var itemreceiptRecord = record.load({ type: "itemreceipt", id: key });
                        var itemreceiptitemList = itemreceiptObj[key];
                        var numLines = itemreceiptRecord.getLineCount({ sublistId: "item" });
                        for (var i = 0; i < numLines; i++) {
                            var line = itemreceiptRecord.getSublistValue({ sublistId: "item", fieldId: "orderline", line: i });
                            for (var p = 0; p < itemreceiptitemList.length; p++) {
                                var itemreceiptitem = itemreceiptitemList[p];
                                if (line == itemreceiptitem.line) {
                                    var custcol_ir_bill_qty = itemreceiptRecord.getSublistValue({ sublistId: "item", fieldId: "custcol_ir_bill_qty", line: i });
                                    custcol_ir_bill_qty = (parseFloat(custcol_ir_bill_qty) || 0) - (parseFloat(itemreceiptitem.custcol_ir_bill_qty) || 0);
                                    if (parseFloat(custcol_ir_bill_qty) < 0) {
                                        custcol_ir_bill_qty = 0;
                                    }
                                    itemreceiptRecord.setSublistValue({ sublistId: "item", fieldId: "custcol_ir_bill_qty", line: i, value: custcol_ir_bill_qty });
                                    break;
                                }
                            }
                        }
                        itemreceiptRecord.save();
                    }
                }

            } catch (e) {
                log.debug("", e);
            }
        }
    }


    return {
        afterSubmit: afterSubmit,
    }
});
