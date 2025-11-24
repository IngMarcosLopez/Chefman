/**
 * 库存转移 UE脚本
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(["../../plugin/bsworks/bsworksUtil-1.0.min", "N/record"], (bsworks, record) => {


    const afterSubmit = (context) => {
        //删除库存转移，修改对应的工单/装配件构建已领料数量
        if (context.type == "delete") {
            try {
                //待修改数据
                const modifyDataObj = {
                    record_type: "",    //待修改记录类型
                    record_id: "",      //待修改记录id
                    picking_todo: 0,    //本次领料数量
                    itemList: []        //待修改货品行数据
                };
                const recordObj = context.oldRecord;
                const lineCount = recordObj.getLineCount({ sublistId: "inventory" });
                for (let line = 0; line < lineCount; line++) {
                    const sourcedocFlag = recordObj.getSublistValue({ sublistId: "inventory", fieldId: "custcol_chefman_sourcedoc_flag", line: line });
                    if (bsworks.isNullOrEmpty(sourcedocFlag)) continue;
                    const sourceDocArr = sourcedocFlag.split("#");
                    if (modifyDataObj.record_type == "") {
                        modifyDataObj.record_type = sourceDocArr[0];
                    }
                    if (modifyDataObj.record_id == "") {
                        modifyDataObj.record_id = sourceDocArr[1];
                    }
                    if ((parseFloat(modifyDataObj.picking_todo) || 0) == 0) {
                        modifyDataObj.picking_todo = sourceDocArr[2];
                    }
                    if ("workorder" == sourceDocArr[0]) {
                        const quantity = recordObj.getSublistValue({ sublistId: "inventory", fieldId: "adjustqtyby", line: line });
                        const modifyItem = { quantity: quantity, line: sourceDocArr[3] };
                        modifyDataObj.itemList.push(modifyItem);
                    }
                }

                if ("" != modifyDataObj.record_type && "" != modifyDataObj.record_type
                    && (parseFloat(modifyDataObj.picking_todo) || 0) > 0) {
                    if ("workorder" == modifyDataObj.record_type) {
                        modifyWorkorderQuantity(modifyDataObj);
                    } else if ("assemblybuild" == modifyDataObj.record_type) {
                        modifyAssemblybuildQuantity(modifyDataObj);
                    }
                }



            } catch (e) {
                log.debug("", e);
            }
        }
    }

    /**
     * 处理需要反填工单已领料数量字段值的记录
     * @param {*} modifyDataObj 
     */
    const modifyWorkorderQuantity = (modifyDataObj) => {
        const workorderRecord = record.load({ type: modifyDataObj.record_type, id: modifyDataObj.record_id });
        let custbody_csm_picking_set = workorderRecord.getValue("custbody_csm_picking_set");
        custbody_csm_picking_set = (parseFloat(custbody_csm_picking_set) || 0) - (parseFloat(modifyDataObj.picking_todo) || 0);
        if (parseFloat(custbody_csm_picking_set) < 0) {
            custbody_csm_picking_set = 0;
        }
        workorderRecord.setValue({ fieldId: "custbody_csm_picking_set", value: custbody_csm_picking_set });
        const lineCount = workorderRecord.getLineCount({ sublistId: "item" });
        for (let i = 0; i < lineCount; i++) {
            const line = workorderRecord.getSublistValue({ sublistId: "item", fieldId: "line", line: i });
            const workorderItemList = modifyDataObj.itemList;
            for (var p = 0; p < workorderItemList.length; p++) {
                const workorderItem = workorderItemList[p];
                if (line == workorderItem.line) {
                    let custcol_workshop_stock_qty = workorderRecord.getSublistValue({ sublistId: "item", fieldId: "custcol_workshop_stock_qty", line: i });
                    custcol_workshop_stock_qty = (parseFloat(custcol_workshop_stock_qty) || 0) - (parseFloat(workorderItem.quantity) || 0);
                    if (parseFloat(custcol_workshop_stock_qty) < 0) {
                        custcol_workshop_stock_qty = 0;
                    }
                    workorderRecord.setSublistValue({ sublistId: "item", fieldId: "custcol_workshop_stock_qty", line: i, value: custcol_workshop_stock_qty });
                    break;
                }
            }
        }
        workorderRecord.save();
    }

    /**
    * 处理需要反填装配件构建已领料数量字段值的记录
    * @param {*} modifyDataObj 
    */
    const modifyAssemblybuildQuantity = (modifyDataObj) => {
        const assemblyRecord = record.load({ type: modifyDataObj.record_type, id: modifyDataObj.record_id });
        let custbody_csm_picking_set = assemblyRecord.getValue("custbody_csm_picking_set");
        custbody_csm_picking_set = (parseFloat(custbody_csm_picking_set) || 0) - (parseFloat(modifyDataObj.picking_todo) || 0);
        if (parseFloat(custbody_csm_picking_set) < 0) {
            custbody_csm_picking_set = 0;
        }
        assemblyRecord.setValue({ fieldId: "custbody_assemblybuild_operator", value: "" });
        assemblyRecord.setValue({ fieldId: "custbody_csm_picking_set", value: custbody_csm_picking_set });
        assemblyRecord.save();
    }

    return {
        afterSubmit,
    }
});