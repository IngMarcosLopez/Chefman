/**
 * 供应商对账平台 客户端脚本
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["../../Util/bsworksUtil.min", "N/ui/dialog", "N/record", 'N/url', "N/https"],
    function (bsworksUtil, dialog, record, hostUrl, https) {

        //suitelet配置文件
        var suiteletConfig = {};

        /**
         * 页面初始化
         * @param {*} context 
         */
        function pageInit(context) {
            suiteletConfig = bsworksUtil.doClientPageInit();
            var filtersConfig = suiteletConfig.filtersConfig;
            var sublistConfig = suiteletConfig.sublistConfig;

            var maskId = "custom_mask";
            var searchButtonId = "custpage_search_button";
            var searchButtonObj = document.getElementById(searchButtonId);
            searchButtonObj.addEventListener("click", function () {
                searchButtonObj.disabled = true;
                document.getElementById(maskId).style.display = "block";
                setTimeout(function () {
                    bsworksUtil.doSearch(context, searchButtonId, filtersConfig);
                }, 100);
            });

            var resetButtonId = "custpage_reset_button";
            var resetButtonObj = document.getElementById(resetButtonId);
            resetButtonObj.addEventListener("click", function () {
                resetButtonObj.disabled = true;
                document.getElementById(maskId).style.display = "block";
                setTimeout(function () {
                    bsworksUtil.doReset(context, resetButtonId, filtersConfig);
                }, 100);
            });
            var excelButtonId = "custpage_exportexcel_button";
            var excelButtonObj = document.getElementById(excelButtonId);
            excelButtonObj.addEventListener("click", function () {
                excelButtonObj.disabled = true;
                document.getElementById(maskId).style.display = "block";
                setTimeout(function () {
                    doExportExcel(context, excelButtonId, sublistConfig);
                }, 100);
            });

            var submitButtonId = "submitter";
            var submitButtonObj = document.getElementById(submitButtonId);
            submitButtonObj.onclick = "";
            submitButtonObj.addEventListener("click", function () {
                submitButtonObj.disabled = true;
                document.getElementById(maskId).style.display = "block";
                setTimeout(function () {
                    doCreateVendorbill(context, submitButtonId);
                }, 100);
            });

            var listmarkall = document.getElementById("custpage_subitem_listmarkall");
            listmarkall.addEventListener("click", function () {
                document.getElementById(maskId).style.display = "block";
                setTimeout(function () {
                    doGetSummaryBarHtml(context.currentRecord);
                }, 100);
            });

            var listunmarkall = document.getElementById("custpage_subitem_listunmarkall");
            listunmarkall.addEventListener("click", function () {
                document.getElementById(maskId).style.display = "block";
                setTimeout(function () {
                    doGetSummaryBarHtml(context.currentRecord);
                }, 100);
            });

        }

        /**
         * 执行开票
         * @param {*} context 
         * @param {*} buttonId 
         * @returns 
         */
        function doCreateVendorbill(context, buttonId) {
            try {
                var subdataList = doGetSubmitData(context);
                if (subdataList.length == 0) {
                    bsworksUtil.clearLoadingMask(buttonId);
                    dialog.alert({
                        title: "提示",
                        message: "请至少选择一条记录"
                    });
                    return;
                }
                //检查子公司、供应商、币别是否一致
                var subdata0 = subdataList[0];
                var hasDiff = false;
                for (var i = 1; i < subdataList.length; i++) {
                    var subdata = subdataList[i];
                    if (subdata0.subsidiary != subdata.subsidiary || subdata0.vendor != subdata.vendor
                        || subdata0.currency != subdata.currency) {
                        hasDiff = true;
                        break;
                    }
                }
                if (hasDiff) {
                    bsworksUtil.clearLoadingMask(buttonId);
                    dialog.alert({
                        title: "提示",
                        message: "已选择记录的子公司、供应商、币别必须一致"
                    });
                    return;
                }
                //判断总金额是否为0、是否有采购订单货品行
                var total_amount = 0;
                for (var i = 0; i < subdataList.length; i++) {
                    var subdata = subdataList[i];
                    if ((parseInt(subdata.line) || 0) == 0) {
                        bsworksUtil.clearLoadingMask(buttonId);
                        dialog.alert({
                            title: "提示",
                            message: "已选择记录无对应的采购订单货品行"
                        });
                        return;
                    }
                    total_amount = parseFloat(total_amount) + (parseFloat(subdata.fxamount) || 0);
                }
                if (parseFloat(total_amount) <= 0) {
                    bsworksUtil.clearLoadingMask(buttonId);
                    dialog.alert({
                        title: "提示",
                        message: "应开票金额必须大于0"
                    });
                    return;
                }

                var tranid = context.currentRecord.getValue("custpage_vendorbill_tranid");
                if (bsworksUtil.isNullOrEmpty(tranid)) {
                    bsworksUtil.clearLoadingMask(buttonId);
                    dialog.alert({
                        title: "提示",
                        message: "请输入账单参考编号"
                    });
                    return;
                }
                var ordertype = context.currentRecord.getValue("custpage_order_type");     //字段赋值
                if (bsworksUtil.isNullOrEmpty(ordertype)) {
                    bsworksUtil.clearLoadingMask(buttonId);
                    dialog.alert({
                        title: "提示",
                        message: "请输入订单类型"
                    });
                    return;
                }

                var suiteletUrl = hostUrl.resolveScript({
                    scriptId: "customscript_bsw_plat_vendorbill_sl",
                    deploymentId: "customdeploy_bsw_plat_vendorbill_sl"
                });
                var requestUrl = "https://" + hostUrl.resolveDomain({ hostType: hostUrl.HostType.APPLICATION }) + suiteletUrl;
                var requestBody = {
                    doPostButton: "doCreateVendorbill",
                    maindata: {
                        tranid: tranid,
                        ordertype: ordertype,
                    },
                    subdataList: subdataList
                }

                https.post.promise({
                    url: requestUrl,
                    body: JSON.stringify(requestBody),
                    headers: {
                        "Content-Type": "application/json"
                    }
                }).then(function (response) {
                    bsworksUtil.clearLoadingMask(buttonId);
                    var responseObject = JSON.parse(response.body);
                    console.log(responseObject)
                    if (responseObject.status == "fail") {
                        dialog.alert({
                            title: "错误提示",
                            message: responseObject.message
                        });
                    } else {
                        setWindowChanged(window, false);
                        var responseData = responseObject.data;
                        var targetUrl = "https://" + hostUrl.resolveDomain({ hostType: hostUrl.HostType.APPLICATION }) + "/app/accounting/transactions/vendbill.nl?id=" + responseData.billId + "&whence=&e=T";
                        window.open(targetUrl, "_blank");

                        document.getElementById("custom_mask").style.display = "block";
                        setTimeout(function () {
                            bsworksUtil.doSearch(context, "custpage_search_button", suiteletConfig.filtersConfig);
                        }, 500);
                    }
                }).catch(function onRejected(reason) {
                    bsworksUtil.clearLoadingMask(buttonId);
                    dialog.alert({
                        title: "错误提示",
                        message: reason
                    });
                });

            } catch (e) {
                bsworksUtil.clearLoadingMask(buttonId);
                console.log(e);
                dialog.alert({
                    title: "错误提示",
                    message: e.message
                });
            }
        }

        /**
         * 获取提交的数据
         * @param {*} context 
         * @returns 
         */
        function doGetSubmitData(context) {
            var objRecord = context.currentRecord;
            var sublistId = "custpage_subitem_list";
            var numLines = objRecord.getLineCount({ sublistId: sublistId });

            var subdataList = [];
            for (var i = 0; i < numLines; i++) {
                var sublist_checkbox = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "sublist_checkbox", line: i });
                if (bsworksUtil.isNullOrEmpty(sublist_checkbox)) {
                    sublist_checkbox = false;
                }
                if (!sublist_checkbox) continue;
                var itemreceiptId = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "internalid", line: i });
                var subsidiary = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "subsidiary", line: i });
                var vendor = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "mainname", line: i });
                var currency = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "currency", line: i });
                var purchaseId = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "createdfrom", line: i });
                var item = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "item", line: i });
                var rate = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "fxrate", line: i });
                //应开票数量
                var quantitybilling = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "quantitybilling", line: i });
                //已开票数量
                var custcol_ir_bill_qty = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "custcol_ir_bill_qty", line: i });

                var unit = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "unitid", line: i });
                var taxcode = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "taxcode", line: i });
                // var taxrate = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "taxrate", line: i });
                var line = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "line", line: i });
                var lineuniquekey = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "lineuniquekey", line: i });
                var taxrate = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "taxrate", line: i });
                var fxamount = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "fxamount", line: i });
                var department = objRecord.getSublistValue({ sublistId: sublistId, fieldId: "department", line: i });
                subdataList.push({
                    itemreceiptId: itemreceiptId,
                    subsidiary: subsidiary, vendor: vendor, currency: currency,
                    purchaseId: purchaseId, item: item, rate: rate, unit: unit,
                    quantitybilling: quantitybilling, custcol_ir_bill_qty: custcol_ir_bill_qty,
                    taxcode: taxcode, line: line, lineuniquekey: lineuniquekey, department: department,
                    taxrate: taxrate, fxamount: fxamount
                });
            }
            return subdataList;
        }

        function doExportExcel(context, excelButtonId, sublistConfig) {
            var subdataList = [];
            try {
                var objRecord = context.currentRecord;
                var sublistId = "custpage_subitem_list";
                var numLines = objRecord.getLineCount({ sublistId: sublistId });
                var fieldsConfig = sublistConfig.sublistFields;
                for (var i = 0; i < numLines; i++) {
                    var subData = { sublist_line_num: i + 1 };
                    for (var f = 0; f < fieldsConfig.length; f++) {
                        var fieldConfig = fieldsConfig[f];
                        if (null != fieldConfig.displayType && "hidden" == fieldConfig.displayType) continue;
                        var fieldId = fieldConfig.id;
                        if (!bsworksUtil.isNullOrEmpty(fieldConfig.asias)) {
                            fieldId = fieldConfig.asias;
                        }
                        subData[fieldId] = objRecord.getSublistValue({ sublistId: sublistId, fieldId: fieldId, line: i })
                        if (null != fieldConfig.type && "select" == fieldConfig.type) {
                            subData[fieldId] = objRecord.getSublistValue({ sublistId: sublistId, fieldId: fieldId + "_display_name", line: i })
                        }
                    }
                    subdataList.push(subData);
                }
            } catch (e) {
                console.log(e);
                dialog.alert({
                    title: "错误提示",
                    message: e.message
                });
                return;
            } finally {
                bsworksUtil.clearLoadingMask(excelButtonId);
            }
            bsworksUtil.doExportExcel(context, excelButtonId, sublistConfig, null, subdataList);
        }

        /**
         * 自动改变脚本
         * @param {*} context 
         */
        function fieldChanged(context) {
            if (context.sublistId == "custpage_subitem_list") {
                if (context.fieldId == "quantitybilling") {
                    var recordObj = context.currentRecord;
                    var quantity = recordObj.getSublistValue({ sublistId: context.sublistId, fieldId: "quantity", line: context.line });
                    var custcol_ir_bill_qty = recordObj.getSublistValue({ sublistId: context.sublistId, fieldId: "custcol_ir_bill_qty", line: context.line });
                    var quantitybilling = recordObj.getCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId });
                    var quantitybilling_tmp = parseFloat(quantity) - parseFloat(custcol_ir_bill_qty);
                    quantitybilling_tmp = parseFloat(quantitybilling_tmp).toFixed(2);
                    if (bsworksUtil.isNullOrEmpty(quantitybilling)) quantitybilling = 0;
                    if (parseFloat(quantitybilling) <= 0 || parseFloat(quantitybilling) > parseFloat(quantitybilling_tmp)) {
                        var message = "应开票数量不能大于" + quantitybilling_tmp;
                        if (parseFloat(quantitybilling) <= 0) {
                            message = "应开票数量必须大于0";
                        }
                        dialog.alert({
                            title: "提示",
                            message: message
                        });
                        recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: context.fieldId, value: quantitybilling_tmp });
                        return;
                    }

                    //计算应付款
                    var taxrate = recordObj.getSublistValue({ sublistId: context.sublistId, fieldId: "taxrate", line: context.line });
                    var fxamount = parseFloat(quantitybilling) * parseFloat(taxrate);
                    // var fxamount = parseFloat(quantitybilling) * (parseFloat(fxrate) || 0) * (1 + taxcode_rate / 100);
                    fxamount = fxamount.toFixed(2);
                    recordObj.setCurrentSublistValue({ sublistId: context.sublistId, fieldId: "fxamount", value: fxamount });
                }
                if (context.fieldId == "sublist_checkbox") {
                    //计算合计值
                    doGetSummaryBarHtml(context.currentRecord);
                }
            }
        }

        /**
         * 计算总金额、总税额
         * @param {*} recordObj 
         */
        function doGetSummaryBarHtml(recordObj) {
            try {
                document.getElementById("custom_mask").style.display = "block";
                //总金额=勾选行的∑(未税单价*(1+税率)*应开票数量)
                //总税额=勾选行的∑(未税单价*税率)*应开票数量
                var totalFxamount = 0;
                var totalTaxamount = 0;

                var sublistId = "custpage_subitem_list";
                var numLines = recordObj.getLineCount({ sublistId: sublistId });

                for (var i = 0; i < numLines; i++) {
                    var sublist_checkbox = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "sublist_checkbox", line: i });
                    if (sublist_checkbox) {
                        var fxrate = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "fxrate", line: i });
                        var taxcode_rate = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "taxcode_rate", line: i });
                        var quantitybilling = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "quantitybilling", line: i });
                        var fxamount = ((parseFloat(fxrate) || 0) * (1 + (parseFloat(taxcode_rate) || 0) / 100) * (parseFloat(quantitybilling) || 0)).toFixed(2);
                        var taxamount = ((parseFloat(fxrate) || 0) * ((parseFloat(taxcode_rate) || 0) / 100) * (parseFloat(quantitybilling) || 0)).toFixed(2);
                        totalFxamount = parseFloat(totalFxamount) + parseFloat(fxamount);
                        totalTaxamount = parseFloat(totalTaxamount) + parseFloat(taxamount);
                    }
                }
                totalFxamount = parseFloat(totalFxamount).toFixed(2);
                totalTaxamount = parseFloat(totalTaxamount).toFixed(2);

                var summaryBarHtml = "总金额：" + totalFxamount + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;总税额：" + totalTaxamount;
                jQuery("#bsworksSummaryBar").html(summaryBarHtml);
            } catch (e) {
                console.log(e);
                log.error("doGetSummaryBarHtml", e);
            } finally {
                bsworksUtil.clearLoadingMask(null);
            }


        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged
        }
    });