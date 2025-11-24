/**
 * 工单-库存转移 客户端事件
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 */

define(["../../../plugin/bsworks/bsworksUtil-1.0.min", "N/ui/dialog"], (bsworks, dialog) => {

    //数字保留小数位
    const number_toFixed = 8;

    /**
     * 页面初始化
     * @param {*} context 
     */
    const pageInit = (context) => {
        bsworks.client.pageInit();

        var submitButtonId = "submitter";
        var submitButtonObj = document.getElementById(submitButtonId);
        submitButtonObj.onclick = "";
        submitButtonObj.addEventListener("click", function () {
            submitButtonObj.disabled = true;
            document.getElementById(bsworks.constant.client.LAODING_MASK_ID).style.display = "block";
            setTimeout(function () {
                doCreateInventoryTransfer(context, submitButtonId);
            }, 100);
        });
    }

    /**
     * 创建库存转移单
     * @param {*} context 
     * @param {*} buttonId 
     */
    const doCreateInventoryTransfer = (context, buttonId) => {
        try {
            const submitData = doGetSubmitData(context);
            let subdataList = [];
            if (null != submitData.subdataList && submitData.subdataList.length > 0) {
                subdataList = submitData.subdataList;
            }
            if (subdataList.length == 0) {
                dialog.alert({
                    title: "提示",
                    message: "货品明细行数据不能为空"
                });
                return;
            }
            for (let i = 0; i < subdataList.length; i++) {
                const subdata = subdataList[i];
                if ((parseFloat(subdata.quantity) || 0) == 0) {
                    dialog.alert({
                        title: "提示",
                        message: "货品明细第" + subdata.sublist_line_num + "行数量不能为空"
                    });
                    return;
                }
                if ((parseFloat(subdata.quantity) || 0) > (parseFloat(subdata.quantityavailable) || 0)) {
                    dialog.alert({
                        title: "提示",
                        message: "货品明细第" + subdata.sublist_line_num + "行待转移数量不能大于可用量"
                    });
                    return;
                }
            }
            const responseObject = bsworks.https.post("bsw_workorder_pickitem_sl", "doCreateInventoryTransfer", submitData);
            if (responseObject.status == "fail") {
                dialog.alert({
                    title: "错误提示",
                    message: responseObject.message
                });
            } else {

                setWindowChanged(window, false);
                const responseData = responseObject.data;
                const targetUrl = bsworks.https.getResolveDomainUrl() + "/app/accounting/transactions/invtrnfr.nl?id=" + responseData.internalid;
                window.open(targetUrl, "_blank");

                document.getElementById(bsworks.constant.client.LAODING_MASK_ID).style.display = "block";
                setTimeout(function () {
                    window.close();
                }, 500);
            }


        } catch (e) {
            console.log(e);
            dialog.alert({
                title: "错误提示",
                message: e.message
            });
        } finally {
            bsworks.client.mask.clearLoadingMask(buttonId);
        }
    }

    /**
    * 获取提交的数据
    * @param {*} context 
    * @returns 
    */
    const doGetSubmitData = (context) => {
        const recordObj = context.currentRecord;
        const picking_set = parseFloat(recordObj.getValue("custpage_csm_picking_set")) || 0;
        const picking_todo = parseFloat(recordObj.getValue("custpage_csm_picking_todo")) || 0;
        //已领料数量
        const custbody_csm_picking_set = bsworks.number.toFixed((parseFloat(picking_set) + parseFloat(picking_todo)), number_toFixed);
        const submitData = {
            internalid: recordObj.getValue("custpage_internalid"),
            subsidiary: recordObj.getValue("custpage_subsidiary"),
            location: recordObj.getValue("custpage_location_form"),
            transferlocation: recordObj.getValue("custpage_location"),
            custbody_csm_picking_set: custbody_csm_picking_set,
            //本次需领料数量
            picking_todo: picking_todo,
            custbody_chefman_assembly: recordObj.getValue("custpage_assemblyitem"),
            custbody_chefman_bom: recordObj.getValue("custpage_billofmaterials"),
            custbody_chefman_bom_rev: recordObj.getValue("custpage_billofmaterialsrevision"),
            memo: recordObj.getValue("custpage_pickitem_type"),
        };
        const subdataList = []; //表体数据
        const subdataCheckedList = []; //选中的表体数据
        const sublistId = bsworks.constant.suitelet.SUBLIST_ID;
        const lineCount = recordObj.getLineCount({ sublistId: sublistId });
        for (let i = 0; i < lineCount; i++) {
            const quantity = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "quantity", line: i });
            if ((parseFloat(quantity) || 0) == 0) continue;
            const item = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "item", line: i });
            const units = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "units", line: i });
            const line = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "line", line: i });
            const custcol_workshop_stock_qty = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custcol_workshop_stock_qty", line: i });
            const quantityavailable = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "quantityavailable", line: i });
            const sublist_line_num = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "sublist_line_num", line: i });
            const subdata = {
                sublist_line_num: sublist_line_num,
                quantity: quantity,
                item: item,
                units: units,
                line: line,
                quantityavailable: quantityavailable,
                custcol_workshop_stock_qty: custcol_workshop_stock_qty
            };
            subdataList.push(subdata);
            const sublist_checkbox = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "sublist_checkbox", line: i });
            if (sublist_checkbox) {
                subdataCheckedList.push(subdata);
            }
        }
        submitData["subdataList"] = subdataCheckedList.length == 0 ? subdataList : subdataCheckedList;
        return submitData;
    }

    /**
     * 字段改变事件
     * @param {*} context 
     */
    const fieldChanged = (context) => {
        const recordObj = context.currentRecord;
        //是否按套领料
        if (context.fieldId == "custpage_pickitem_package") {
            const pickitemPackage = recordObj.getValue(context.fieldId);
            let pickTodoField = recordObj.getField("custpage_csm_picking_todo");
            if (pickitemPackage) {
                pickTodoField.isDisabled = false;
                const pickingTodo = bsworks.number.toFixed(((parseFloat(recordObj.getValue("custpage_quantity")) || 0) - (parseFloat(recordObj.getValue("custpage_csm_picking_set")) || 0)), number_toFixed);
                recordObj.setValue({ fieldId: "custpage_csm_picking_todo", value: pickingTodo });
            } else {
                pickTodoField.isDisabled = true;
                recordObj.setValue({ fieldId: "custpage_csm_picking_todo", value: "" });
            }
        } else if (context.fieldId == "custpage_csm_picking_todo") {
            //计算货品行待领料数量
            //表头需领料数量
            const pickTodo = recordObj.getValue(context.fieldId);
            if (bsworks.isNullOrEmpty(pickTodo)) {
                //计算货品行数量
                modifyItemQuantity(recordObj, pickTodo);
                return;
            }
            //表头数量
            const custpage_quantity = recordObj.getValue("custpage_quantity");
            //表头已领料数量
            const pickDone = recordObj.getValue("custpage_csm_picking_set");
            if (bsworks.number.toFixed(((parseFloat(pickTodo) || 0) + (parseFloat(pickDone) || 0)), number_toFixed) > parseFloat(custpage_quantity)) {
                dialog.alert({
                    title: "错误提示",
                    message: "需领料数量不能大于剩余领料数量"
                });
                const pickingTodo = bsworks.number.toFixed(((parseFloat(custpage_quantity) || 0) - (parseFloat(pickDone) || 0)), number_toFixed);
                recordObj.setValue({ fieldId: "custpage_csm_picking_todo", value: pickingTodo });
                return;
            }
            //计算货品行数量
            modifyItemQuantity(recordObj, pickTodo);
        }
        if (context.sublistId == "custpage_subitem_list") {
            //数量不能大于剩余数量
            if (context.fieldId == "quantity") {
                const quantity = recordObj.getCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId });
                if ((parseFloat(quantity) || 0) == 0) return;
                const quantity_orig = recordObj.getSublistValue({ sublistId: context.sublistId, fieldId: "quantity_orig", line: context.line });
                const quantity_done = recordObj.getSublistValue({ sublistId: context.sublistId, fieldId: "custcol_workshop_stock_qty", line: context.line });
                const quantity_suplus = bsworks.number.toFixed(((parseFloat(quantity_orig) || 0) - (parseFloat(quantity_done) || 0)), number_toFixed);
                if (quantity > quantity_suplus) {
                    dialog.alert({
                        title: "错误提示",
                        message: "需领料数量不能大于剩余领料数量"
                    });
                    const pickTodo = recordObj.getValue("custpage_csm_picking_todo");
                    const custpage_quantity = recordObj.getValue("custpage_quantity");
                    const quantity = calItemQuantity(pickTodo, custpage_quantity, quantity_orig, quantity_done);
                    recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId, value: quantity });
                }
            }
        }
    }

    /**
     * 修改货品行数量
     * @param {*} recordObj 
     * @param {*} pickTodo 表头需领料数量
     */
    const modifyItemQuantity = (recordObj, pickTodo) => {
        //表头数量
        const custpage_quantity = recordObj.getValue("custpage_quantity");
        const sublistId = "custpage_subitem_list";
        const lineCount = recordObj.getLineCount({ sublistId: sublistId });
        if (lineCount > 0) {
            for (let line = 0; line < lineCount; line++) {
                const quantity_orig = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "quantity_orig", line: line });
                const quantity_done = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custcol_workshop_stock_qty", line: line });
                const quantity = calItemQuantity(pickTodo, custpage_quantity, quantity_orig, quantity_done);
                recordObj.selectLine({ sublistId: sublistId, line: line });
                recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "quantity", value: quantity, forceSyncSourcing: true });
            }
        }
    }

    /**
     * 计算货品行数量
     * @param {*} pickTodo 表头需领料数量
     * @param {*} custpage_quantity 表头数量
     * @param {*} quantity_orig  表体货品原始数量
     * @param {*} quantity_done  表体已领料数量
     * @returns 
     */
    const calItemQuantity = (pickTodo, custpage_quantity, quantity_orig, quantity_done) => {
        //货品行数量 = 需领料数量 * 货品行数量 / 表头数量
        let quantity = bsworks.number.toFixed(((parseFloat(pickTodo) || 0) * (parseFloat(quantity_orig) || 0) / (parseFloat(custpage_quantity) || 0)), number_toFixed);
        //剩余领料数量 = 货品行原始数量 - 货品行已领料数量
        const quantity_suplus = bsworks.number.toFixed(((parseFloat(quantity_orig) || 0) - (parseFloat(quantity_done) || 0)), number_toFixed);
        if ((parseFloat(pickTodo) || 0) == 0 || parseFloat(quantity) > parseFloat(quantity_suplus)) {
            quantity = quantity_suplus;
        }
        return quantity;
    }


    return {
        pageInit,
        fieldChanged
    }

});