/**
 * 库存调整 客户端脚本
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/ui/dialog"], (dialog) => {


    const pageInit = (context) => {
        const subsidiary = context.currentRecord.getValue("subsidiary");
        if (null != subsidiary && subsidiary == "25") {
            nlapiDisableLineItemField('inventory', 'adjustqtyby', true);
            // nlapiDisableLineItemField('inventory', 'inventorydetail', true); //此功能无效
        }
    }
    const fieldChanged = (context) => {
        const recordObj = context.currentRecord;
        if (context.fieldId == 'subsidiary') {
            const subsidiary = recordObj.getValue("subsidiary");
            if (subsidiary == "25") {
                nlapiDisableLineItemField('inventory', 'adjustqtyby', true);
            } else {
                nlapiDisableLineItemField('inventory', 'adjustqtyby', false);
            }

        }
        if (context.sublistId == 'inventory') {
            const subsidiary = recordObj.getValue("subsidiary");
            if (subsidiary == "25") {
                if (context.fieldId == 'item') {
                    recordObj.setCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'adjustqtyby',
                        value: 0
                    });
                } else if (context.fieldId == 'custcol_swc_adjust_quantity') {
                    const quantity = recordObj.getCurrentSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_swc_adjust_quantity'
                    });
                    if ((parseFloat(quantity) || 0) != 0) {
                        recordObj.setCurrentSublistValue({
                            sublistId: 'inventory',
                            fieldId: 'adjustqtyby',
                            value: 0
                        });
                    }
                }
            }
        }
    }

    const validateLine = (context) => {
        if (context.sublistId == 'inventory') {
            const recordObj = context.currentRecord;
            const subsidiary = recordObj.getValue("subsidiary");
            if (subsidiary == "25") {
                return validateLine25(recordObj);
            }
        }
        return true;
    }

    const validateLine25 = (recordObj) => {
        //调整数量 
        const quantity = recordObj.getCurrentSublistValue({
            sublistId: 'inventory',
            fieldId: 'custcol_swc_adjust_quantity'
        });
        if (quantity == "" || quantity == "0") {
            dialog.alert({
                title: "错误提示",
                message: "调整数量不能为空或零"
            });
            return false;
        }
        //仓库
        const location = recordObj.getCurrentSublistValue({
            sublistId: 'inventory',
            fieldId: 'location'
        });
        //库位
        const locationBin = recordObj.getCurrentSublistValue({
            sublistId: 'inventory',
            fieldId: 'custcol_chefman_location_bin'
        });
        if (location == "32" && (locationBin == null || locationBin == "")) {
            dialog.alert({
                title: "错误提示",
                message: "库位不能为空"
            });
            return false;
        }
        //调整类型=1&5，估计单位成本填写值必须>0
        const custbody_ia_type = recordObj.getValue("custbody_ia_type");
        if (custbody_ia_type == "1" || custbody_ia_type == "5") {
            const unitcost = recordObj.getCurrentSublistValue({
                sublistId: 'inventory',
                fieldId: 'unitcost'
            });
             if ((parseFloat(unitcost) || 0) < 0) {
                 dialog.alert({
                     title: "错误提示",
                     message: "估计单位成本必须大于零"
                 });
                return false;
            }
        }
        return true;
    }

    const saveRecord = (context) => {
        try {
            const recordObj = context.currentRecord;
            const subsidiary = recordObj.getValue("subsidiary");
            if (subsidiary == "25") {
                const lineCount = recordObj.getLineCount({ sublistId: 'inventory' });
                for (let i = 0; i < lineCount; i++) {
                    recordObj.selectLine({
                        sublistId: 'inventory',
                        line: i
                    });
                    const res = validateLine25(recordObj);
                    recordObj.commitLine({ sublistId: 'inventory', line: i });
                    if (!res) {
                        return res;
                    }
                }
            }
        } catch (e) {
            log.error("saveRecord", e);
        }

        return true;
    }

    return {
        pageInit,
        fieldChanged,
        validateLine,
        saveRecord
    }
});