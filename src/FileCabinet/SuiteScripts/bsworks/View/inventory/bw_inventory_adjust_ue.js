/**
 * 库存调整 UE脚本
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

//请配置下面字段
var obj = {
    //TODO 单据类型     子表ID               数量字段ID                                    主表数量合计字段ID
    "purchaseorder":{"sublistId":"item","sublist_quantityId":"quantity","main_quantityId":"custbody_swc_total"},//采购订单
    "inventoryadjustment":{"sublistId":"inventory","sublist_quantityId":"custcol_ia_adjust_value","main_quantityId":"custbody_ia_adjust_total"},//库存调整

}


define(["N/record"], (record) => {

    const beforeSubmit = (scriptContext) => {
        var newRec = scriptContext.newRecord;
        var type = scriptContext.type;
        var orderType = newRec.type;//单据类型
        if (type == "delete") return;

        try {
            var SUBLIST_ID = obj[orderType]["sublistId"];
            var SUBLIST_QUANTITY_ID = obj[orderType]["sublist_quantityId"];
            var MAIN_QUANTITY_ID = obj[orderType]["main_quantityId"];


            if (type == "create" || type == "copy" || type == "edit") {
                var lineCount = newRec.getLineCount({sublistId: SUBLIST_ID});
                var allQuantity = 0;
                for (var i = 0; i < lineCount; i++) {
                    var quantity = newRec.getSublistValue({
                        sublistId: SUBLIST_ID,
                        fieldId: SUBLIST_QUANTITY_ID,
                        line: i
                    }) || 0;
                    allQuantity = addN(allQuantity,quantity);
                }
                newRec.setValue({
                    fieldId:MAIN_QUANTITY_ID,
                    value:allQuantity
                });
            }
        } catch (e) {
            log.error({title: 'e', details:e });
            throw "配置数量自动赋值错误,请联系开发人员;" + e;
        }

    }

    function addN(a, b) {
        a = parseFloatOrZero(a);
        b = parseFloatOrZero(b);
        return add(a, b);
    }
    function parseFloatOrZero(v) {
        return parseFloat(v) || 0;
    }
    /**
     * 浮点数加法
     * @param {*} a
     * @param {*} b
     */
    function add(a, b) {
        a = toNonExponential(a);
        b = toNonExponential(b);
        var c, d, e;
        try {
            c = a.toString().split('.')[1].length;
        } catch (f) {
            c = 0;
        }
        try {
            d = b.toString().split('.')[1].length;
        } catch (f) {
            d = 0;
        }
        return (e = Math.pow(10, Math.max(c, d))), (mul(a, e) + mul(b, e)) / e;
    }
    // JavaScript中科学计数法转化为数值字符串形式
    function toNonExponential(num) {
        num = Number(num);
        var m = num.toExponential().match(/\d(?:.(\d*))?e([+-]\d+)/);
        return num.toFixed(Math.max(0, (m[1] || '').length - m[2]));
    }
    /**
     * 浮点数乘法
     * @param {*} a
     * @param {*} b
     */
    function mul(a, b) {
        a = toNonExponential(a);
        b = toNonExponential(b);
        var c = 0,
            d = a.toString(),
            e = b.toString();
        try {
            c += d.split('.')[1].length;
        } catch (f) {}
        try {
            c += e.split('.')[1].length;
        } catch (f) {}
        return (
            (Number(d.replace('.', '')) * Number(e.replace('.', ''))) /
            Math.pow(10, c)
        );
    }


    const afterSubmit = (context) => {
        const newRecord = context.newRecord;
        const subsidiary = newRecord.getValue("subsidiary");
        const approvalstatus = newRecord.getValue("custbody_chefman_hp_approvalstatus");
        if (subsidiary == "25" && approvalstatus == "2") {
            const recordObj = record.load({
                type: 'inventoryadjustment',
                id: newRecord.id,
                isDynamic: true
            });
            const lineCount = recordObj.getLineCount({ sublistId: 'inventory' });
            let saveRecord = false;
            for (let i = 0; i < lineCount; i++) {
                recordObj.selectLine({ sublistId: "inventory", line: i });
                const quantity = recordObj.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_swc_adjust_quantity',
                });
                const adjustqtyby = recordObj.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'adjustqtyby',
                });
                if ((parseFloat(quantity) || 0) == (parseFloat(adjustqtyby) || 0)) continue;
                recordObj.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'adjustqtyby',
                    value: quantity,
                });

                //设置库存详细信息
                const locationBin = recordObj.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_chefman_location_bin',
                });
                let inventoryDetail = null;
                try {
                    recordObj.removeCurrentSublistSubrecord({ sublistId: "inventory", fieldId: "inventorydetail" });
                    inventoryDetail = recordObj.getCurrentSublistSubrecord({ sublistId: "inventory", fieldId: "inventorydetail" });
                } catch (e) {
                    log.error("hasInventoryDetail", e);
                }

                log.debug("hasInventoryDetail", inventoryDetail);
                if (null != locationBin && "" != locationBin && null != inventoryDetail) {
                    inventoryDetail.selectNewLine({ sublistId: "inventoryassignment" });
                    inventoryDetail.setCurrentSublistValue({
                        sublistId: "inventoryassignment",
                        fieldId: "binnumber",
                        value: locationBin,
                    });
                    inventoryDetail.setCurrentSublistValue({
                        sublistId: "inventoryassignment",
                        fieldId: "quantity",
                        value: quantity,
                    });

                    inventoryDetail.commitLine({ sublistId: 'inventoryassignment' });
                }
                recordObj.commitLine({ sublistId: 'inventory' });
                saveRecord = true;
            }
            if (saveRecord) {
                recordObj.save({ ignoreMandatoryFields: true });
            }
        }

    }

    return {
        beforeSubmit,
        afterSubmit,
    }
});