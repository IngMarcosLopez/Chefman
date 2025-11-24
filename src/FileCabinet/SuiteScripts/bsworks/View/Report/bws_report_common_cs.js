/**
 * 报表中心通用客户端脚本
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(["N/ui/dialog", "../Plat/bws_plat_common", "../../plugin/bsworks/bsworksUtil-2.0"],
    (dialog, platCommon, bsworks) => {

        //suitelet配置文件
        var suiteletConfig = {};
        var suiteletScriptName = "";

        const pageInit = (context) => {
            try {
                suiteletConfig = platCommon.pageInit(context);
                suiteletScriptName = suiteletConfig.scriptConfig.suiteletScriptName;

                //成品成本构成明细表
                if (suiteletScriptName == "report_ica_cost_account_sl") {
                    //计算单位成本
                    const calcostButtonId = "custpage_cal_unitcost_button";
                    const calcostButtonObj = document.getElementById(calcostButtonId);
                    if (calcostButtonObj) {
                        calcostButtonObj.addEventListener("click", () => {
                            bsworks.client().mask.showLoadingMask(calcostButtonId);
                            setTimeout(() => {
                                doCalUnitCost(context, calcostButtonId);
                            }, 100);
                        });
                    }
                    //生成平均成本
                    const avgcostButtonId = "custpage_get_avgcost_button";
                    const avgcostButtonObj = document.getElementById(avgcostButtonId);
                    if (avgcostButtonObj) {
                        avgcostButtonObj.addEventListener("click", () => {
                            bsworks.client().mask.showLoadingMask(avgcostButtonId);
                            setTimeout(() => {
                                doGetAvgCost(context, avgcostButtonId);
                            }, 100);
                        });
                    }

                    //料工费数据记录
                    const savecostButtonId = "custpage_save_cost_button";
                    const savecostButtonObj = document.getElementById(savecostButtonId);
                    if (savecostButtonObj) {
                        savecostButtonObj.addEventListener("click", () => {
                            setTimeout(() => {
                                doDialogSubmitter(context, savecostButtonId);
                            }, 100);
                        });
                    }

                    //导出excel

                    const groupExportButtonId = "custpage_groupcost_export_button";
                    const groupExportButtonObj = document.getElementById(groupExportButtonId);
                    if (groupExportButtonObj) {
                        groupExportButtonObj.addEventListener("click", () => {
                            bsworks.client().mask.showLoadingMask(groupExportButtonId);
                            setTimeout(() => {
                                doGroupDataExport(context, groupExportButtonId);
                            }, 100);
                        });
                    }
                    document.getElementById(bsworks.constant.suitelet.SUBLIST_ID + "txt").click();
                }

                //半成品成本构成明细表
                else if (suiteletScriptName == "report_ica_cost_acc_bcp_sl") {
                    //计算单位成本
                    const calcostButtonId = "custpage_cal_unitcost_button";
                    const calcostButtonObj = document.getElementById(calcostButtonId);
                    if (calcostButtonObj) {
                        calcostButtonObj.addEventListener("click", () => {
                            bsworks.client().mask.showLoadingMask(calcostButtonId);
                            setTimeout(() => {
                                doCalUnitCost(context, calcostButtonId);
                            }, 100);
                        });
                    }

                    //记录产品成本
                    const savecostButtonId = "custpage_save_cost_button";
                    const savecostButtonObj = document.getElementById(savecostButtonId);
                    if (savecostButtonObj) {
                        savecostButtonObj.addEventListener("click", () => {
                            setTimeout(() => {
                                doDialogSubmitter(context, savecostButtonId);
                            }, 100);
                        });
                    }
                }

            } catch (e) {
                console.log(e);
            }
        }


        /**
         * 执行提交操作
         * @param {*} context 
         */
        const doDialogSubmitter = (context, buttonId) => {
            const dialogTitle = document.getElementById(buttonId).value;
            let dialogMessage = "确定要" + dialogTitle + "？";

            //半成品成本构成明细表
            if (suiteletScriptName == "report_ica_cost_acc_bcp_sl") {


            }
            dialog.create({
                title: dialogTitle,
                message: dialogMessage,
                buttons: [
                    { label: '确定', value: 1 },
                    { label: '取消', value: 2 }
                ]
            }).then((result) => {
                if (result == 1) {
                    bsworks.client().mask.showLoadingMask(buttonId);
                    setTimeout(() => {
                        doSubmitter(context, buttonId);
                    }, 200);
                }
            }).catch((error) => {
                dialog.alert({
                    title: "错误提示",
                    message: error
                });
            });

        }

        const doSubmitter = (context, buttonId) => {
            try {
                //半成品成本构成明细表
                if (suiteletScriptName == "report_ica_cost_acc_bcp_sl") {
                    const sublistId = bsworks.constant.suitelet.SUBLIST_ID;
                    let subdataList = getSublistDatalist(context, sublistId, true);
                    if (subdataList.length == 0) {
                        bsworks.client().mask.clearLoadingMask(buttonId);
                        dialog.alert({
                            title: "提示",
                            message: "请至少选择一条记录"
                        });
                        return;
                    }
                    platCommon.saveRecord(context, suiteletConfig, buttonId, "doSaveCostAccount", subdataList);
                }

                //成品成本构成明细表
                else if (suiteletScriptName == "report_ica_cost_account_sl") {
                    const sublistId = "custpage_sublist_groupcost";
                    let subdataList = getSublistDatalist(context, sublistId, true);
                    if (subdataList.length == 0) {
                        bsworks.client().mask.clearLoadingMask(buttonId);
                        dialog.alert({
                            title: "提示",
                            message: "请至少选择一条记录"
                        });
                        return;
                    }
                    platCommon.saveRecord(context, suiteletConfig, buttonId, "doSaveCPCostAccount", subdataList);
                }

            } catch (e) {
                console.log("doSubmitter", e);
                dialog.alert({
                    title: "提示",
                    message: e.message
                });
            } finally {
                // bsworks.client().mask.clearLoadingMask(buttonId);

            }
        }


        const doGroupDataExport = (context, buttonId) => {
            try {
                const sublistId = "custpage_sublist_groupcost";
                const sublistConfig = suiteletConfig.sublistConfig.find(item => item.id == sublistId);
                const subdataList = bsworks.client().sublist.getSublistDatalist(context, sublistConfig.fields, sublistId, false, false, true);

                bsworks.client().event.doExportExcel(context, buttonId, sublistConfig.label, sublistConfig, subdataList);


            } catch (e) {
                console.log("doGroupDataExport", e);
                dialog.alert({
                    title: "提示",
                    message: e.message
                });
            } finally {
                bsworks.client().mask.clearLoadingMask(buttonId);

            }
        }


        /**
         * 计算单位成本
         * @param {*} context 
         * @returns 
         */
        const doCalUnitCost = (context, buttonId) => {
            try {
                const recordObj = context.currentRecord;
                const sublistId = bsworks.constant.suitelet.SUBLIST_ID;
                let subdataList = getSublistDatalist(context, sublistId, false);
                subdataList.forEach(subdata => {
                    const line = parseInt(subdata.sublist_line_num) - 1;
                    const quantity = subdata.quantity;
                    if (parseFloat(quantity) > 0) {
                        const formulacurrency_1 = parseFloat(subdata.formulacurrency_1) || 0;
                        const formulacurrency_2 = parseFloat(subdata.formulacurrency_2) || 0;
                        const formulacurrency_3 = parseFloat(subdata.formulacurrency_3) || 0;
                        const formulacurrency_4 = parseFloat(subdata.formulacurrency_4) || 0;
                        const formulacurrency_1_unit = (formulacurrency_1 / parseFloat(quantity)).toFixed(6);
                        const formulacurrency_2_unit = (formulacurrency_2 / parseFloat(quantity)).toFixed(6);
                        const formulacurrency_3_unit = (formulacurrency_3 / parseFloat(quantity)).toFixed(6);
                        const formulacurrency_4_unit = (formulacurrency_4 / parseFloat(quantity)).toFixed(6);

                        const total_unitcost = (parseFloat(formulacurrency_1_unit) + parseFloat(formulacurrency_2_unit)
                            + parseFloat(formulacurrency_3_unit) + parseFloat(formulacurrency_4_unit)).toFixed(6);

                        recordObj.selectLine({ sublistId: sublistId, line: line });
                        recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_1_unit", value: formulacurrency_1_unit });
                        recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_2_unit", value: formulacurrency_2_unit });
                        recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_3_unit", value: formulacurrency_3_unit });
                        recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_4_unit", value: formulacurrency_4_unit });
                        recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "total_unitcost", value: total_unitcost });
                    }
                })
                dialog.alert({
                    title: "提示",
                    message: "操作成功"
                });

            } catch (e) {
                console.log("doCalUnitCost", e);
                dialog.alert({
                    title: "提示",
                    message: e.message
                });
            } finally {
                bsworks.client().mask.clearLoadingMask(buttonId);

            }

        }

        /**
        * 创建平均成本
        * @param {*} context 
        * @returns 
        */
        const doGetAvgCost = (context, buttonId) => {
            try {
                const recordObj = context.currentRecord;
                let subdataList = getSublistDatalist(context, null, false);
                const groupdataObj = {};
                subdataList.forEach(subdata => {
                    const key = subdata.item_display_name + "#" + subdata.displayname
                        + "#" + (subdata.trandate).substring(0, 7);
                    if (null == groupdataObj[key]) {
                        groupdataObj[key] = [];
                    }
                    groupdataObj[key].push(subdata);
                })
                const subsidiary = recordObj.getValue("custpage_subsidiary");
                const newDataList = [];
                for (const key in groupdataObj) {
                    const groupDataList = groupdataObj[key];
                    const groupData0 = groupDataList[0];
                    groupData0.subsidiary2 = subsidiary;
                    groupData0.total_quantity = groupData0.quantity;
                    groupData0.formulacurrency_12 = groupData0.formulacurrency_1;
                    groupData0.formulacurrency_22 = groupData0.formulacurrency_2;
                    groupData0.formulacurrency_32 = groupData0.formulacurrency_3;
                    groupData0.formulacurrency_42 = groupData0.formulacurrency_4;
                    for (let g = 1; g < groupDataList.length; g++) {
                        const groupdata = groupDataList[g];
                        groupData0.total_quantity = (parseFloat(groupData0.total_quantity) || 0) + (parseFloat(groupdata.quantity) || 0);
                        groupData0.formulacurrency_12 = (parseFloat(groupData0.formulacurrency_12) || 0) + (parseFloat(groupdata.formulacurrency_1) || 0);
                        groupData0.formulacurrency_22 = (parseFloat(groupData0.formulacurrency_22) || 0) + (parseFloat(groupdata.formulacurrency_2) || 0);
                        groupData0.formulacurrency_32 = (parseFloat(groupData0.formulacurrency_32) || 0) + (parseFloat(groupdata.formulacurrency_3) || 0);
                        groupData0.formulacurrency_42 = (parseFloat(groupData0.formulacurrency_42) || 0) + (parseFloat(groupdata.formulacurrency_4) || 0);
                    }
                    groupData0.formulacurrency_12 = parseFloat(groupData0.formulacurrency_12).toFixed(2);
                    groupData0.formulacurrency_22 = parseFloat(groupData0.formulacurrency_22).toFixed(2);
                    groupData0.formulacurrency_32 = parseFloat(groupData0.formulacurrency_32).toFixed(2);
                    groupData0.formulacurrency_42 = parseFloat(groupData0.formulacurrency_42).toFixed(2);
                    groupData0.total_cost2 = ((parseFloat(groupData0.formulacurrency_12) || 0) + (parseFloat(groupData0.formulacurrency_22) || 0)
                        + (parseFloat(groupData0.formulacurrency_32) || 0) + (parseFloat(groupData0.formulacurrency_42) || 0)).toFixed(2);

                    groupData0.formulacurrency_1_unit2 = (parseFloat(groupData0.formulacurrency_12) || 0) / parseFloat(groupData0.total_quantity);
                    groupData0.formulacurrency_2_unit2 = (parseFloat(groupData0.formulacurrency_22) || 0) / parseFloat(groupData0.total_quantity);
                    groupData0.formulacurrency_3_unit2 = (parseFloat(groupData0.formulacurrency_32) || 0) / parseFloat(groupData0.total_quantity);
                    groupData0.formulacurrency_4_unit2 = (parseFloat(groupData0.formulacurrency_42) || 0) / parseFloat(groupData0.total_quantity);

                    groupData0.formulacurrency_1_unit2 = parseFloat(groupData0.formulacurrency_1_unit2).toFixed(6);
                    groupData0.formulacurrency_2_unit2 = parseFloat(groupData0.formulacurrency_2_unit2).toFixed(6);
                    groupData0.formulacurrency_3_unit2 = parseFloat(groupData0.formulacurrency_3_unit2).toFixed(6);
                    groupData0.formulacurrency_4_unit2 = parseFloat(groupData0.formulacurrency_4_unit2).toFixed(6);
                    groupData0.total_unitcost2 = (parseFloat(groupData0.formulacurrency_1_unit2) + parseFloat(groupData0.formulacurrency_2_unit2)
                        + parseFloat(groupData0.formulacurrency_3_unit2) + parseFloat(groupData0.formulacurrency_4_unit2)).toFixed(6);
                    newDataList.push(groupData0);
                }
                const sublistId = "custpage_sublist_groupcost";
                const lineCount = recordObj.getLineCount({ sublistId: sublistId });
                for (let line = lineCount - 1; line >= 0; line--) {
                    recordObj.removeLine({ sublistId: sublistId, line: line });
                }
                newDataList.forEach((newdata, index) => {
                    recordObj.selectNewLine({ sublistId: sublistId });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "sublist_line_num1", value: (index + 1) });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "subsidiary2", value: newdata.subsidiary2 });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "item2", value: newdata.item });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "item_display_name2", value: newdata.item_display_name });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "displayname2", value: newdata.displayname });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "month", value: (newdata.trandate).substring(0, 7) });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "total_quantity", value: newdata.total_quantity });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_12", value: newdata.formulacurrency_12 });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_22", value: newdata.formulacurrency_22 });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_32", value: newdata.formulacurrency_32 });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_42", value: newdata.formulacurrency_42 });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "total_cost2", value: newdata.total_cost2 });

                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_1_unit2", value: newdata.formulacurrency_1_unit2 });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_2_unit2", value: newdata.formulacurrency_2_unit2 });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_3_unit2", value: newdata.formulacurrency_3_unit2 });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "formulacurrency_4_unit2", value: newdata.formulacurrency_4_unit2 });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "total_unitcost2", value: newdata.total_unitcost2 });
                    recordObj.commitLine({ sublistId: sublistId });
                })

                document.getElementById(sublistId + "txt").click();

                dialog.alert({
                    title: "提示",
                    message: "操作成功"
                });


            } catch (e) {
                console.log("doGetAvgCost", e);
                dialog.alert({
                    title: "提示",
                    message: e.message
                });
            } finally {
                bsworks.client().mask.clearLoadingMask(buttonId);

            }

        }


        const getSublistDatalist = (context, sublistId, checked) => {
            if (!sublistId) {
                sublistId = bsworks.constant.suitelet.SUBLIST_ID;
            }
            const sublistConfig = suiteletConfig.sublistConfig.find(item => item.id == sublistId);
            const subdataList = bsworks.client().sublist.getSublistDatalist(context, sublistConfig.fields, sublistId, false, checked);
            return subdataList;
        }




        const fieldChanged = (context) => {

        }

        return {
            pageInit,
            // fieldChanged
        }
    });