/**
 * 平台中心通用客户端脚本
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(["N/ui/dialog", "N/record", "N/format", "./bws_plat_common", "../../plugin/bsworks/bsworksUtil-2.0"],
    (dialog, record, format, platCommon, bsworks) => {

        //suitelet配置文件
        var suiteletConfig = {};
        var suiteletScriptName = "";

        const pageInit = (context) => {
            try {
                suiteletConfig = platCommon.pageInit(context);
                suiteletScriptName = suiteletConfig.scriptConfig.suiteletScriptName;

                const submitButtonId = "submitter";
                const submitButtonObj = document.getElementById(submitButtonId);
                if (submitButtonObj) {
                    submitButtonObj.type = "button";
                    submitButtonObj.onclick = "";
                    submitButtonObj.addEventListener("click", () => {
                        setTimeout(() => {
                            doDialogSubmitter(context, submitButtonId);
                        }, 100);
                    });
                }

                const secondsubmitButtonId = "secondarysubmitter";
                const secondsubmitButtonObj = document.getElementById(secondsubmitButtonId);
                if (secondsubmitButtonObj) {
                    secondsubmitButtonObj.type = "button";
                    secondsubmitButtonObj.onclick = "";
                    secondsubmitButtonObj.addEventListener("click", () => {
                        setTimeout(() => {
                            doDialogSubmitter(context, secondsubmitButtonId);
                        }, 100);
                    });
                }

                //生产成本分摊工作台
                if (suiteletScriptName == "plat_ca_cost_share_sl") {
                    //取消分摊

                    const cancelShareButtonId = "custpage_cancel_share_button";
                    const cancelShareButtonObj = document.getElementById(cancelShareButtonId);
                    if (cancelShareButtonObj) {
                        cancelShareButtonObj.addEventListener("click", () => {
                            setTimeout(() => {
                                doDialogCancelShare(context, cancelShareButtonId);
                            }, 100);
                        });
                    }
                    //计算成本
                    const calcostButtonId = "custpage_calcost_button";
                    const calcostButtonObj = document.getElementById(calcostButtonId);
                    if (calcostButtonObj) {
                        calcostButtonObj.addEventListener("click", () => {
                            bsworks.client().mask.showLoadingMask(calcostButtonId);
                            setTimeout(() => {
                                doCalCost(context, calcostButtonId);
                            }, 100);
                        });
                    }
                    const recordObj = context.currentRecord;
                    //分摊类型
                    const sharetype = recordObj.getValue("custpage_share_type");
                    if (sharetype == "3") {
                        const chLineCount = recordObj.getLineCount({ sublistId: "custpage_sublist_checkhours" });
                        if (chLineCount > 0) {
                            document.getElementById("custpage_sublist_checkhourstxt").click();
                            dialog.alert({
                                title: "提示",
                                message: "请进入相应完工单据填写机器工时或人工工时后再计算成本"
                            });
                            return;
                        }
                    }

                }

                //出库单开票工作台
                else if (suiteletScriptName == "plat_sc_itemful_invoice_sl") {

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

            //生产成本分摊工作台
            if (suiteletScriptName == "plat_ca_cost_share_sl") {
                dialogMessage = "是否确认分摊，已准确核查数据？";
                let nochecked = false;
                const recordObj = context.currentRecord;
                const sublistId = bsworks.constant.suitelet.SUBLIST_ID;
                const lineCount = recordObj.getLineCount({ sublistId: sublistId });
                for (let line = 0; line < lineCount; line++) {
                    const sublistCheckbox = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "sublist_checkbox", line: line });
                    if (!sublistCheckbox) {
                        nochecked = true;
                        break;
                    }

                }

                if (nochecked) {
                    dialogMessage = "存在明细数据未勾选行，请确认是否执行分摊？";
                }

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
                const recordObj = context.currentRecord;
                //生产成本分摊工作台
                if (suiteletScriptName == "plat_ca_cost_share_sl") {
                    let subdataList = [];
                    //判断是否执行继续分摊操作
                    let custpage_share_record = recordObj.getValue("custpage_share_record");
                    if (custpage_share_record) {
                        const shareRecordObj = record.load({ type: "customrecord_ca_cost_share_plat_record", id: custpage_share_record });
                        const sublistId = "recmachcustrecord_ca_cost_share_record_mid";
                        const lineCount = shareRecordObj.getLineCount({ sublistId: sublistId });
                        for (let line = 0; line < lineCount; line++) {
                            const share_subdata = shareRecordObj.getSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_cost_share_item_data", line: line });
                            const subdata = JSON.parse(share_subdata);
                            subdata.share_record_internalid = custpage_share_record;
                            subdataList.push(subdata);
                        }

                    } else {
                        const account_balance = recordObj.getValue("custpage_account_balance");
                        if (!account_balance) {
                            bsworks.client().mask.clearLoadingMask(buttonId);
                            dialog.alert({
                                title: "提示",
                                message: "关联工费科目余额不能为空！"
                            });
                            return;
                        }
                        subdataList = getSublistDatalist(context, true);
                        if (subdataList.length == 0) {
                            bsworks.client().mask.clearLoadingMask(buttonId);
                            dialog.alert({
                                title: "提示",
                                message: "请至少选择一条记录"
                            });
                            return;
                        }

                        const errorMsgs = [];
                        subdataList.forEach(subdata => {
                            const errorMsg = [];
                            if (!subdata.custpage_ca_machine_cost) {
                                errorMsg.push("分摊制造费用");
                            }
                            if (!subdata.custpage_ca_person_cost) {
                                errorMsg.push("分摊直接人工");
                            }
                            if (errorMsg.length > 0) {
                                errorMsgs.push("第 " + subdata.sublist_line_num + " 行" + errorMsg.join(", ") + "不能为空");
                            }
                        })
                        if (errorMsgs.length > 0) {
                            bsworks.client().mask.clearLoadingMask(buttonId);
                            dialog.alert({
                                title: "提示",
                                message: errorMsgs.join("; ")
                            });
                            return;
                        }

                        //保存数据到分摊记录表
                        const shareObj = saveCaCostShareRecord(subdataList);
                        custpage_share_record = shareObj.internalid;

                        const shareRecordField = recordObj.getField({ fieldId: 'custpage_share_record' });
                        shareRecordField.insertSelectOption({
                            text: shareObj.share_time,
                            value: shareObj.internalid
                        });
                        recordObj.setValue({ fieldId: "custpage_share_record", value: custpage_share_record });


                        subdataList = subdataList.map(subdata => {
                            subdata.custbody_ca_cost_allocationed = true;
                            subdata.share_record_internalid = custpage_share_record;
                            return subdata;
                        })
                    }


                    platCommon.saveRecord(context, suiteletConfig, buttonId, "doSaveAssemblyBuildCost", subdataList);
                }

                //出库单开票工作台
                else if (suiteletScriptName == "plat_sc_itemful_invoice_sl") {
                    let subdataList = getSublistDatalist(context, true);
                    if (subdataList.length == 0) {
                        bsworks.client().mask.clearLoadingMask(buttonId);
                        dialog.alert({
                            title: "提示",
                            message: "请至少选择一条记录"
                        });
                        return;
                    }
                    //根据销售订单+出库单分组
                    const groupdataObj = {};
                    subdataList.forEach(subdata => {
                        const key = subdata.createdfrom + "#" + subdata.internalid;
                        if (null == groupdataObj[key]) {
                            groupdataObj[key] = [];
                        }
                        groupdataObj[key].push(subdata);
                    })
                    const newsubdataList = [];
                    for (const key in groupdataObj) {
                        newsubdataList.push({
                            createdfrom: key.split("#")[0],
                            subdataList: groupdataObj[key]
                        })
                    }
                    platCommon.saveRecord(context, suiteletConfig, buttonId, "doCreateSalesInvoice", newsubdataList);
                }
                //销货成本结转工作台
                else if (suiteletScriptName == "plat_sc_itemful_setting_sl") {
                    let subdataList = getSublistDatalist(context, true);
                    if (subdataList.length == 0) {
                        bsworks.client().mask.clearLoadingMask(buttonId);
                        dialog.alert({
                            title: "提示",
                            message: "请至少选择一条记录"
                        });
                        return;
                    }
                    //根据销售发票号分组
                    const groupdataObj = {};
                    subdataList.forEach(subdata => {
                        if (null == groupdataObj[subdata.internalid_invoice]) {
                            groupdataObj[subdata.internalid_invoice] = [];
                        }
                        groupdataObj[subdata.internalid_invoice].push(subdata);
                    })
                    const newsubdataList = [];
                    for (const key in groupdataObj) {
                        newsubdataList.push({
                            internalid: key,
                            subdataList: groupdataObj[key]
                        })
                    }
                    platCommon.saveRecord(context, suiteletConfig, buttonId, "doSettingInvoice", newsubdataList);
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


        /**
        * 保存成本分摊记录表，用于分摊报错时二次分摊
        * @param {*} subdataList 
        */
        const saveCaCostShareRecord = (subdataList) => {
            var shareRecord = record.create({
                type: "customrecord_ca_cost_share_plat_record",
                isDynamic: true
            });
            //完工单数据
            const sublistId = "recmachcustrecord_ca_cost_share_record_mid";
            subdataList.forEach(subdata => {
                shareRecord.selectNewLine({ sublistId: sublistId });
                shareRecord.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_cost_share_assemblybuild", value: subdata.internalid });
                shareRecord.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_cost_share_item_data", value: JSON.stringify(subdata) });
                shareRecord.commitLine({ sublistId: sublistId });
            })
            //分摊时间
            const share_time = bsworks.date(format).getCurrentTimezoneStr();
            shareRecord.setValue({ fieldId: "name", value: share_time });
            const internalid = shareRecord.save({ ignoreMandatoryFields: true });
            return { internalid, share_time };
        }


        const doDialogCancelShare = (context, buttonId) => {
            const dialogTitle = document.getElementById(buttonId).value;
            const dialogMessage = "确定要" + dialogTitle + "？";
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
                        doCancelShare(context, buttonId);
                    }, 200);
                }
            }).catch((error) => {
                dialog.alert({
                    title: "错误提示",
                    message: error
                });
            });
        }

        const doCancelShare = (context, buttonId) => {
            try {
                const subdataList = getSublistDatalist(context, true);
                if (subdataList.length == 0) {
                    bsworks.client().mask.clearLoadingMask(buttonId);
                    dialog.alert({
                        title: "提示",
                        message: "请至少选择一条记录"
                    });
                    return;
                }

                const newdataList = subdataList.map(subdata => {
                    subdata.custpage_ca_machine_cost = 0;
                    subdata.custpage_ca_person_cost = 0;
                    subdata.custbody_ca_quota_allocation_build = false;
                    subdata.custbody_ca_cost_allocationed = false;
                    subdata.trandate = "";
                    return subdata;
                })

                platCommon.saveRecord(context, suiteletConfig, buttonId, "doSaveAssemblyBuildCost", newdataList);


            } catch (e) {
                console.log("doCancelShare", e);
                dialog.alert({
                    title: "提示",
                    message: e.message
                });
            } finally {
                // bsworks.client().mask.clearLoadingMask(buttonId);

            }
        }

        /**
         * 计算成本
         * @param {*} context 
         * @returns 
         */
        const doCalCost = (context, buttonId) => {
            try {
                const recordObj = context.currentRecord;
                //分摊类型
                const sharetype = recordObj.getValue("custpage_share_type");
                if (sharetype == "3") {
                    const chLineCount = recordObj.getLineCount({ sublistId: "custpage_sublist_checkhours" });
                    if (chLineCount > 0) {
                        dialog.alert({
                            title: "提示",
                            message: "请进入相应完工单据填写机器工时或人工工时后再计算成本"
                        });
                        return;
                    }
                }

                let subdataList = getSublistDatalist(context, true);
                doCalWoQuantityHours(recordObj, subdataList);
                // subdataList = subdataList.filter(subdata => !subdata.custbody_ca_cost_allocationed);
                if (subdataList.length == 0) {
                    dialog.alert({
                        title: "提示",
                        message: "请至少选择一未分配条记录"
                    });
                    return;
                }
                //单位人工成本
                let custpage_person_expense = 0;
                //单位制造费用
                let custpage_manufac_expense = 0;

                //总直接人工
                let total_direct_labor = recordObj.getValue("custpage_total_direct_labor") || 0;
                //总制造费用
                let total_manufac_expense = recordObj.getValue("custpage_total_manufac_expense") || 0;
                //定额分配∑(分摊直接人工)
                let detotal_person_cost = 0;
                //定额分配∑(分摊制造费用)
                let detotal_machine_cost = 0;
                //定额分配∑(完工人工工时)
                let detotal_person_hour = 0;
                //定额分配∑(完工机器工时)
                let detotal_machine_hour = 0;
                //定额分配∑(完工数量)
                let detotal_quantity = 0;

                // console.log("subdataList", subdataList);
                subdataList.forEach(subdata => {
                    if (subdata.custbody_ca_quota_allocation_build) {
                        detotal_person_cost = parseFloat(detotal_person_cost) + parseFloat(subdata.custpage_ca_person_cost || 0);
                        detotal_machine_cost = parseFloat(detotal_machine_cost) + parseFloat(subdata.custpage_ca_machine_cost || 0);
                        detotal_person_hour = parseFloat(detotal_person_hour) + parseFloat(subdata.custbody_ca_person_hour || 0);
                        detotal_machine_hour = parseFloat(detotal_machine_hour) + parseFloat(subdata.custbody_ca_machine_hour || 0);
                        detotal_quantity = parseFloat(detotal_quantity) + parseFloat(subdata.quantity || 0);
                    }
                })
                total_direct_labor = (parseFloat(total_direct_labor) - parseFloat(detotal_person_cost)).toFixed(2);
                total_manufac_expense = (parseFloat(total_manufac_expense) - parseFloat(detotal_machine_cost)).toFixed(2);

                if (sharetype == "3") {
                    //总人工工时
                    let total_person_hours = recordObj.getValue("custpage_total_person_hours") || 0;
                    total_person_hours = (parseFloat(total_person_hours) - parseFloat(detotal_person_hour)).toFixed(8);
                    //总机器工时
                    let total_machine_hours = recordObj.getValue("custpage_total_machine_hours") || 0;
                    total_machine_hours = (parseFloat(total_machine_hours) - parseFloat(detotal_machine_hour)).toFixed(8);

                    //单位人工成本 按实际工时占比：公式为（总直接人工-定额分配∑(分摊直接人工)）/（总人工工时-定额分配∑(完工人工工时)）；
                    if (parseFloat(total_person_hours) > 0) {
                        custpage_person_expense = parseFloat(total_direct_labor) / parseFloat(total_person_hours);
                        custpage_person_expense = custpage_person_expense.toFixed(8);
                    }
                    // console.log("custpage_person_expense", total_direct_labor, detotal_person_cost, total_person_hours, detotal_person_hour, custpage_person_expense);
                    //单位制造费用 按实际工时占比：公式为（总制造费用-定额分配∑(分摊制造费用)）/总机器工时-定额分配∑(完工机器工时)）
                    //（新）单位制造费用 按实际工时占比：公式为（总制造费用-定额分配∑(分摊制造费用)）/（总人工工时-定额分配∑(完工人工工时)）
                    if (parseFloat(total_person_hours) > 0) {
                        custpage_manufac_expense = parseFloat(total_manufac_expense) / parseFloat(total_person_hours);
                        custpage_manufac_expense = custpage_manufac_expense.toFixed(8);
                    }
                } else {
                    //总完工数量
                    let total_woquantity = recordObj.getValue("custpage_total_woquantity") || 0;
                    total_woquantity = (parseFloat(total_woquantity) - parseFloat(detotal_quantity)).toFixed(2);
                    if (parseFloat(total_woquantity) > 0) {
                        //单位人工成本 按完工数量占比：公式为（总直接人工-定额分配∑(分摊直接人工)）/（总完工数量-定额分配∑(完工数量)）；
                        custpage_person_expense = parseFloat(total_direct_labor) / parseFloat(total_woquantity);
                        custpage_person_expense = custpage_person_expense.toFixed(8);
                        //单位制造费用 按完工数量占比：公式为总制造费用-定额分配∑(分摊制造费用)）/（总完工数量-定额分配∑(完工数量)）
                        custpage_manufac_expense = parseFloat(total_manufac_expense) / parseFloat(total_woquantity);
                        custpage_manufac_expense = custpage_manufac_expense.toFixed(8);
                    }
                }

                recordObj.setValue({ fieldId: "custpage_person_expense", value: custpage_person_expense });
                recordObj.setValue({ fieldId: "custpage_manufac_expense", value: custpage_manufac_expense });

                //清除分摊制造费用和分摊直接人工
                doClearCacost(recordObj);

                const newsubdataList = subdataList.filter(sdata => !sdata.custbody_ca_quota_allocation_build);
                const sublistId = bsworks.constant.suitelet.SUBLIST_ID;

                let total_ca_machine_cost = 0;//各行的∑(分摊制造费用）
                let total_ca_person_cost = 0; //各行的∑(分摊直接人工）

                //获取最后一行完工人工工时大于0的索引值
                let lastIndex = newsubdataList.length - 1;
                for (let i = newsubdataList.length - 1; i >= 0; i--) {
                    const subdata = newsubdataList[i];
                    if ((parseFloat(subdata.custbody_ca_person_hour) || 0) > 0) {
                        lastIndex = i;
                        break;
                    }
                }
                console.log("lastIndex", lastIndex, newsubdataList.length - 1);
                newsubdataList.forEach((subdata, index) => {
                    const line = parseInt(subdata.sublist_line_num) - 1;
                    recordObj.selectLine({ sublistId: sublistId, line: line });
                    let custpage_ca_machine_cost = 0; //分摊制造费用
                    let custpage_ca_person_cost = 0;//分摊直接人工
                    if (sharetype == "3") {
                        const ca_machine_hour = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custbody_ca_machine_hour", line: line }) || 0;
                        const ca_person_hour = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custbody_ca_person_hour", line: line }) || 0;
                        //按实际工时占比：公式为=单位制造费用*完工机器工时，尾行分摊金额为总制造费用-各行的∑(分摊制造费用）
                        //（新）按实际工时占比：公式为=单位制造费用*完工人工工时，尾行分摊金额为总制造费用-各行的∑(分摊制造费用）
                        custpage_ca_machine_cost = parseFloat(custpage_manufac_expense) * parseFloat(ca_person_hour);
                        //按实际工时占比：公式为=单位直接人工*完工人工工时，尾行分摊金额为总直接人工-各行的∑(分摊直接人工）
                        custpage_ca_person_cost = parseFloat(custpage_person_expense) * parseFloat(ca_person_hour);

                    } else {
                        const quantity = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "quantity", line: line }) || 0;
                        //按完工数量占比：公式为=单位制造费用*完工数量，尾行分摊金额为总制造费用-各行的∑(分摊制造费用），如果尾行为定额分摊则要往前定义为最后一行
                        custpage_ca_machine_cost = parseFloat(custpage_manufac_expense) * parseFloat(quantity);
                        //按完工数量占比：公式为=单位直接人工*完工数量，尾行分摊金额为总直接人工-各行的∑(分摊直接人工），如果尾行为定额分摊则要往前定义为最后一行
                        custpage_ca_person_cost = parseFloat(custpage_person_expense) * parseFloat(quantity);
                    }

                    custpage_ca_machine_cost = parseFloat(custpage_ca_machine_cost).toFixed(2);
                    custpage_ca_person_cost = parseFloat(custpage_ca_person_cost).toFixed(2);

                    if (index == lastIndex) {
                        total_ca_machine_cost = parseFloat(total_ca_machine_cost).toFixed(2);
                        total_ca_person_cost = parseFloat(total_ca_person_cost).toFixed(2);

                        custpage_ca_machine_cost = (parseFloat(total_manufac_expense) - parseFloat(total_ca_machine_cost)).toFixed(2);
                        // console.log("custpage_ca_machine_cost", total_manufac_expense, total_ca_machine_cost, custpage_ca_machine_cost);

                        custpage_ca_person_cost = (parseFloat(total_direct_labor) - parseFloat(total_ca_person_cost)).toFixed(2);
                        // console.log("custpage_ca_person_cost", total_direct_labor, total_ca_person_cost, custpage_ca_person_cost);
                    } else if (index > lastIndex) {
                        custpage_ca_machine_cost = "0.00";
                        custpage_ca_person_cost = "0.00";
                    } else {
                        total_ca_machine_cost = parseFloat(total_ca_machine_cost) + parseFloat(custpage_ca_machine_cost);
                        total_ca_person_cost = parseFloat(total_ca_person_cost) + parseFloat(custpage_ca_person_cost);
                    }

                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custbody_calc_cost", value: true });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_ca_machine_cost", value: custpage_ca_machine_cost });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_ca_person_cost", value: custpage_ca_person_cost })
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custbody_calc_cost", value: false });
                })

            } catch (e) {
                console.log("doCalCost", e);
                dialog.alert({
                    title: "提示",
                    message: e.message
                });
            } finally {
                bsworks.client().mask.clearLoadingMask(buttonId);

            }

        }

        /**
         * 计算总完工数量/总机器工时/总人工工时
         * @param {*} recordObj 
         * @param {*} subdataList 
         */
        const doCalWoQuantityHours = (recordObj, subdataList) => {
            var total_woquantity = 0;//总完工数量
            var total_machine_hours = 0;//总机器工时
            var total_person_hours = 0;//总人工工时
            subdataList.forEach(subdata => {
                total_woquantity = parseFloat(total_woquantity) + parseFloat(subdata.quantity || 0);
                total_machine_hours = parseFloat(total_machine_hours) + parseFloat(subdata.custbody_ca_machine_hour || 0);
                total_person_hours = parseFloat(total_person_hours) + parseFloat(subdata.custbody_ca_person_hour || 0);

            })
            total_woquantity = parseFloat(total_woquantity).toFixed(8);
            total_machine_hours = parseFloat(total_machine_hours).toFixed(8);
            total_person_hours = parseFloat(total_person_hours).toFixed(8);
            recordObj.setValue({ fieldId: "custpage_total_woquantity", value: total_woquantity });
            recordObj.setValue({ fieldId: "custpage_total_machine_hours", value: total_machine_hours });
            recordObj.setValue({ fieldId: "custpage_total_person_hours", value: total_person_hours });
        }


        /**
         * 清除分摊制造费用和分摊直接人工
         * @param {*} recordObj 
         */
        const doClearCacost = (recordObj) => {
            const sublistId = bsworks.constant.suitelet.SUBLIST_ID;
            const lineCount = recordObj.getLineCount({ sublistId: sublistId });
            for (let line = 0; line < lineCount; line++) {
                const sublistCheckbox = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "sublist_checkbox", line: line });
                if (!sublistCheckbox) {
                    const custpage_ca_machine_cost_old = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custpage_ca_machine_cost_old", line: line }) || "";
                    const custpage_ca_person_cost_old = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custpage_ca_person_cost_old", line: line }) || "";

                    recordObj.selectLine({ sublistId: sublistId, line: line });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custbody_calc_cost", value: true });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_ca_machine_cost", value: custpage_ca_machine_cost_old });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custpage_ca_person_cost", value: custpage_ca_person_cost_old });
                    recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custbody_calc_cost", value: false });
                }

            }
        }

        const getSublistDatalist = (context, checked, returnAll) => {
            const sublistId = bsworks.constant.suitelet.SUBLIST_ID;
            const sublistConfig = suiteletConfig.sublistConfig.find(item => item.id == sublistId);
            const subdataList = bsworks.client().sublist.getSublistDatalist(context, sublistConfig.fields, sublistId, false, checked, returnAll);
            return subdataList;
        }




        const fieldChanged = (context) => {
            //生产成本分摊工作台
            if (suiteletScriptName == "plat_ca_cost_share_sl") {
                const recordObj = context.currentRecord;
                //选择框
                // if (context.fieldId == bsworks.constant.suitelet.SUBLIST_CHECKBOX) {
                //     //取消选择，清除分摊制造费用和分摊直接人工
                //     const sublistCheckbox = recordObj.getCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId });
                //     if (!sublistCheckbox) {
                //         const custpage_ca_machine_cost_old = recordObj.getSublistValue({ sublistId: context.sublistId, fieldId: "custpage_ca_machine_cost_old", line: context.line }) || "";
                //         const custpage_ca_person_cost_old = recordObj.getSublistValue({ sublistId: context.sublistId, fieldId: "custpage_ca_person_cost_old", line: context.line }) || "";

                //         recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: "custpage_ca_machine_cost", value: custpage_ca_machine_cost_old });
                //         recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: "custpage_ca_person_cost", value: custpage_ca_person_cost_old });

                //     }
                // }
                if (context.fieldId == "custbody_ca_quota_allocation_build") {
                    const allocation_build = recordObj.getCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId });
                    if (!allocation_build) {
                        recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: "custbody_calc_cost", value: true });
                        recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: "custpage_ca_machine_cost", value: "" });
                        recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: "custpage_ca_person_cost", value: "" });
                        recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: "custbody_calc_cost", value: false });

                    }
                }
                if (context.fieldId == "custpage_ca_machine_cost" || context.fieldId == "custpage_ca_person_cost") {
                    const custbody_calc_cost = recordObj.getCurrentSublistValue({ sublistId: context.sublistId, fieldId: "custbody_calc_cost" });
                    if (custbody_calc_cost) return;
                    const newdata = recordObj.getCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId });
                    const origdata = recordObj.getCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId + "_old" });
                    if (newdata == origdata) return;
                    const allocation_build = recordObj.getCurrentSublistValue({ sublistId: context.sublistId, fieldId: "custbody_ca_quota_allocation_build" });
                    if (!allocation_build) {
                        recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId, value: origdata });
                        dialog.alert({
                            title: "提示",
                            message: "请先勾选定额分配后再修改数据"
                        });
                    }
                }
            } else if (suiteletScriptName == "plat_sc_itemful_invoice_sl") {
                const recordObj = context.currentRecord;

                if (context.fieldId == "custpage_subsidiary") {
                    const subsidiary = recordObj.getValue(context.fieldId);
                    const customerOptions = platCommon.getSubsidiayCustomer(subsidiary);
                    const custpage_customer_field = recordObj.getField("custpage_customer");
                    custpage_customer_field.removeSelectOption({ value: null });
                    customerOptions.forEach(opdata => {
                        custpage_customer_field.insertSelectOption(opdata);
                    })
                } else if (context.fieldId == "custpage_customer") {
                    const customer = recordObj.getValue(context.fieldId);
                    const selectOptions = platCommon.getScSalesorderOptions(customer);
                    const custpage_salesorder_field = recordObj.getField("custpage_salesorder");
                    custpage_salesorder_field.removeSelectOption({ value: null });
                    selectOptions.forEach(sdata => {
                        custpage_salesorder_field.insertSelectOption(sdata);
                    })
                }

                //选择框
                if (context.fieldId == bsworks.constant.suitelet.SUBLIST_CHECKBOX) {
                    bsworks.client().sublist.showSublistSummary(context, suiteletConfig.sublistConfig[0], true);
                } else if (context.fieldId == "quantity_invoice") {
                    const quantity_invoice = recordObj.getCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId }) || 0;
                    const quantity_invoicing = recordObj.getSublistValue({ sublistId: context.sublistId, fieldId: "quantity_invoicing", line: context.line }) || 0;
                    if (parseFloat(quantity_invoice) <= 0) {
                        dialog.alert({
                            title: "提示",
                            message: "开票数量必须大于0"
                        });
                        recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId, value: quantity_invoicing });
                        return;
                    } else if (parseFloat(quantity_invoice) > parseFloat(quantity_invoicing)) {
                        dialog.alert({
                            title: "提示",
                            message: "开票数量不能大于未开票数量"
                        });
                        recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId, value: quantity_invoicing });
                        return;
                    } else {
                        const rate = recordObj.getSublistValue({ sublistId: context.sublistId, fieldId: "rate", line: context.line }) || 0;
                        const amount = (parseFloat(quantity_invoice) * parseFloat(rate)).toFixed(4);
                        const rate_inctax = recordObj.getSublistValue({ sublistId: context.sublistId, fieldId: "rate_inctax", line: context.line }) || 0;
                        const amount_inctax = (parseFloat(quantity_invoice) * parseFloat(rate_inctax)).toFixed(4);
                        recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: "amount", value: amount });
                        recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: "amount_inctax", value: amount_inctax });
                    }
                }
            } else if (suiteletScriptName == "plat_sc_itemful_setting_sl") {
                const recordObj = context.currentRecord;
                if (context.fieldId == "custpage_accountingperiod") {
                    const accountingperiod = recordObj.getValue(context.fieldId);
                    const invoiceOptions = platCommon.getScRelationTransaction(accountingperiod);
                    const custpage_invoice_field = recordObj.getField("custpage_invoice");
                    custpage_invoice_field.removeSelectOption({ value: null });
                    invoiceOptions.forEach(invdata => {
                        custpage_invoice_field.insertSelectOption(invdata);
                    })
                }
            }
        }

        return {
            pageInit,
            fieldChanged
        }
    });