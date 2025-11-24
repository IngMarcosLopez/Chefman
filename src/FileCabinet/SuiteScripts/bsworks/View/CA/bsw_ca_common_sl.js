/**
 * CA通用业务处理 sl脚本
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/record', "../../plugin/bsworks/bsworksUtil-1.0.min"], (record, bsworks) => {

    const renderPage = (context) => { }


    /**
     * 工费科目发生额执行取数
     * @param {*} requestData 
     */
    const doGetAccountItem = (requestData) => {
        const recordId = requestData.recordId;
        try {
            const recordObj = record.load({ type: "customrecord_ca_ai_account_incurrence", id: recordId, isDynamic: true });

            //查询配置表数据
            const subsidiary = recordObj.getValue("custrecord_ca_ai_subsidiary");
            if (!subsidiary) {
                return bsworks.https.getFailResponse("子公司不能为空！");
            }
            const accountbook = recordObj.getValue("custrecord_ca_ai_accountbook");
            // if (!accountbook) {
            //     return bsworks.https.getFailResponse("会计账簿不能为空！");
            // }
            const accountingperiod = recordObj.getValue("custrecord_ca_ai_account_period");
            if (!accountingperiod) {
                return bsworks.https.getFailResponse("会计期间不能为空！");
            }
            const configSearchFields = [
                { id: "custrecord_ca_rules_subsidiary", join: "CUSTRECORD_CA_RULES_LIST_RELATION", filter: { values: subsidiary } },
                { id: "custrecord_ca_rules_accountbook", search: { type: "none" }, join: "CUSTRECORD_CA_RULES_LIST_RELATION", filter: { values: accountbook } },
            ];
            const configDataList = bsworks.savedSearch.getSearchResultDataList("customsearch_ca_allocation_rules_list", configSearchFields, 1, 1000);
            if (configDataList.length == 0) {
                return bsworks.https.getFailResponse("未查询到匹配的分摊规则配置表记录！");
            }
            const accountList = [];
            configDataList.forEach(data => {
                const accounts = data.custrecord_ca_rules_list_our_account;
                if (accounts) {
                    if (accounts.indexOf(",") != -1) {
                        const accountSplit = accounts.split(",");
                        accountSplit.forEach(ac => {
                            if (!accountList.includes(ac)) {
                                accountList.push(ac);
                            }
                        });
                    } else {
                        if (!accountList.includes(accounts)) {
                            accountList.push(accounts);
                        }
                    }
                }
            })
            log.debug("accountList", accountList);
            if (accountList.length == 0) {
                return bsworks.https.getFailResponse("未查询到分摊规则配置表对应科目！");
            }

            const accountSearchFields = [
                { id: "subsidiary", label: "子公司", filter: { values: subsidiary } },
                { id: "account", label: "对应科目", search: { summary: "group" }, filter: { operator: "anyof", values: accountList } },
                { id: "internalid", label: "会计期间", join: "accountingperiod", search: { type: "none" }, filter: { values: accountingperiod } },
                { id: "accountingbook", label: "会计账簿", filter: { values: accountbook } }
            ];
            const accountDataList = bsworks.savedSearch.getSearchAllResultDataList("customsearch_ca_account_balance", accountSearchFields, 1, 1000);
            if (accountDataList.length == 0) {
                return bsworks.https.getFailResponse("未查询到匹配的工费科目发生额记录！");
            }
            // log.debug("accountDataList", accountDataList);
            const sublistId = "recmachcustrecord_ca_ai_relation_net_amount";
            const lineCount = recordObj.getLineCount({ sublistId: sublistId });
            for (let line = lineCount - 1; line >= 0; line--) {
                recordObj.removeLine({ sublistId: sublistId, line: line });
            }

            accountDataList.forEach(data => {
                recordObj.selectNewLine({ sublistId: sublistId });
                recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_opposite_accoun", value: data.account });
                recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_opposite_accoun_name", value: data.accountgrouped });
                recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_list_accountbook", value: data.accountingbook });
                recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_department", value: data.department });
                recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_location", value: data.location });
                recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_debit_amount", value: data.debitfxamount });
                recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_credit_amount", value: data.creditfxamount });
                const net_account = ((parseFloat(data.debitfxamount) || 0) - (parseFloat(data.creditfxamount) || 0)).toFixed(2);
                recordObj.setCurrentSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_net_account", value: net_account });
                recordObj.commitLine({ sublistId: sublistId });
            })
            recordObj.setValue({ fieldId: "custrecord_ca_ai_run_result", value: "" });
            recordObj.setValue({ fieldId: "custrecord_ca_ai_status", value: "3" }); //已取数


            //删除结转日记账
            const reljournal = recordObj.getValue("custrecord_ca_ai_relation_journey");
            if (null != reljournal && reljournal.length > 0) {
                reljournal.forEach(id => {
                    record.delete({ type: record.Type.JOURNAL_ENTRY, id: id });
                })
            }
            recordObj.setValue({ fieldId: "custrecord_ca_ai_relation_journey", value: "" });
            recordObj.save({ ignoreMandatoryFields: true });

            return bsworks.https.getSuccessResponse();
        } catch (e) {
            log.error("e", e);
            const recordObj = record.load({ type: "customrecord_ca_ai_account_incurrence", id: recordId });
            recordObj.setValue({ fieldId: "custrecord_ca_ai_run_result", value: e.message });
            recordObj.save({ ignoreMandatoryFields: true });
            return bsworks.https.getFailResponse(e.message);
        }

    }


    /**
     * 工费科目发生额-日记账结转
     * @param {*} requestData 
     */
    const doJournalSetting = (requestData) => {
        const recordId = requestData.recordId;
        const journalIds = [];
        try {
            const recordObj = record.load({ type: "customrecord_ca_ai_account_incurrence", id: recordId, isDynamic: true });
            const subsidiary = recordObj.getValue("custrecord_ca_ai_subsidiary");
            if (!subsidiary) {
                return bsworks.https.getFailResponse("子公司不能为空！");
            }
            const accountingperiod = recordObj.getValue("custrecord_ca_ai_account_period");
            if (!accountingperiod) {
                return bsworks.https.getFailResponse("会计期间不能为空！");
            }

            const sublistId = "recmachcustrecord_ca_ai_relation_net_amount";
            const lineCount = recordObj.getLineCount({ sublistId: sublistId });
            const errorMsgs = [];
            let subdataList = [];
            for (let line = 0; line < lineCount; line++) {
                const amount = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_net_account", line: line });
                if (parseFloat(amount) <= 0) {
                    errorMsgs.push("第" + (line + 1) + "条记录科目发生额不能为负数");
                }
                const account_credit = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_opposite_accoun", line: line });
                const account_creditText = recordObj.getSublistText({ sublistId: sublistId, fieldId: "custrecord_ca_ai_opposite_accoun", line: line });
                const department = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_department", line: line });
                const location = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_location", line: line });

                const subdata = {
                    account_credit, department, location, amount, account_creditText
                }
                subdataList.push(subdata);
            }
            if (errorMsgs.length > 0) {
                return bsworks.https.getFailResponse(errorMsgs.join("; "));
            }


            //查询配置表数据
            const accountbook = recordObj.getValue("custrecord_ca_ai_accountbook");
            // if (!accountbook) {
            //     return bsworks.https.getFailResponse("会计账簿不能为空！");
            // }

            const configSearchFields = [
                { id: "custrecord_ca_rules_subsidiary", join: "CUSTRECORD_CA_RULES_LIST_RELATION", filter: { values: subsidiary } },
                { id: "custrecord_ca_rules_accountbook", search: { type: "none" }, join: "CUSTRECORD_CA_RULES_LIST_RELATION", filter: { values: accountbook } },
            ];
            const configDataList = bsworks.savedSearch.getSearchResultDataList("customsearch_ca_allocation_rules_list", configSearchFields, 1, 1000);
            if (configDataList.length == 0) {
                return bsworks.https.getFailResponse("未查询到匹配的分摊规则配置表记录！");
            }
            const accountObj = {};
            configDataList.forEach(data => {
                const accounts = data.custrecord_ca_rules_list_our_account;
                if (accounts) {
                    if (accounts.indexOf(",") != -1) {
                        const accountSplit = accounts.split(",");
                        accountSplit.forEach(ac => {
                            if (null == accountObj[ac]) {
                                accountObj[ac] = data.custrecord_ca_rules_list_opposite_accoun;
                            }
                        });
                    } else {
                        if (null == accountObj[accounts]) {
                            accountObj[accounts] = data.custrecord_ca_rules_list_opposite_accoun;
                        }
                    }
                }
            })
            // log.debug("accountObj", accountObj);
            let accountingperiodText = recordObj.getText("custrecord_ca_ai_account_period");
            let accountingperiodTextArr = accountingperiodText.split(" : ");
            accountingperiodText = accountingperiodTextArr[accountingperiodTextArr.length - 1];
            const memo = accountingperiodText + "会计期间的生产成本发生额结转";
            //默认为每个会计期间的最后一天
            let periodArr = accountingperiodText.split(" ");
            const monthObj = {
                "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04", "MAY": "05", "JUN": "06",
                "JUL": "07", "AUG": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12"
            };
            const periodate = periodArr[1] + "-" + monthObj[periodArr[0].toUpperCase()] + "-01";
            const trandate = bsworks.date.getFirstAndEndtDayInCurrent(periodate)[1];

            subdataList = subdataList.map(subdata => {
                return { ...subdata, ...{ subsidiary, accountingperiod, trandate, memo, account_debit: accountObj[subdata.account_credit] } };
            })

            //根据过渡科目、部门、地点进行分组
            const groupDataObj = {};
            subdataList.forEach(subdata => {
                const key = subdata.subsidiary + "#" + subdata.account_debit + "#" + subdata.department + "#" + subdata.location;
                if (null == groupDataObj[key]) {
                    groupDataObj[key] = [];
                }
                groupDataObj[key].push(subdata);
            })
            // log.debug("groupDataObj", groupDataObj);
            //创建日记账
            for (const key in groupDataObj) {
                const groupsubList = groupDataObj[key];
                const journalData = groupsubList[0];
                const journalsubdataList = [];
                //过渡科目金额
                let amount_debit = 0;
                groupsubList.forEach(sdata => {
                    amount_debit = parseFloat(amount_debit) + parseFloat(sdata.amount);
                    journalsubdataList.push({
                        ...sdata, ...{
                            type: "credit",
                            account: sdata.account_credit
                        }
                    })
                })

                journalsubdataList.push({
                    ...groupsubList[0], ...{
                        type: "debit",
                        account: journalData.account_debit,
                        amount: amount_debit
                    }
                })
                journalData.subdataList = journalsubdataList;
                const internalid = doCreateJournalentry(journalData);
                journalIds.push(internalid);
            }

            recordObj.setValue({ fieldId: "custrecord_ca_ai_run_result", value: "" });
            recordObj.setValue({ fieldId: "custrecord_ca_ai_status", value: "4" }); //已结转
            recordObj.setValue({ fieldId: "custrecord_ca_ai_relation_journey", value: journalIds });
            recordObj.save({ ignoreMandatoryFields: true });

            return bsworks.https.getSuccessResponse();
        } catch (e) {
            log.error("e", e);
            const recordObj = record.load({ type: "customrecord_ca_ai_account_incurrence", id: recordId });
            recordObj.setValue({ fieldId: "custrecord_ca_ai_run_result", value: e.message });
            recordObj.setValue({ fieldId: "custrecord_ca_ai_status", value: "5" }); //结转失败
            recordObj.setValue({ fieldId: "custrecord_ca_ai_relation_journey", value: journalIds });
            recordObj.save({ ignoreMandatoryFields: true });
            return bsworks.https.getFailResponse(e.message);
        }
    }

    /**
      * 创建日记账
      * @param {*} data 
      */
    const doCreateJournalentry = (data) => {
        const journalRecord = record.create({
            type: record.Type.JOURNAL_ENTRY,
            isDynamic: true
        });
        journalRecord.setValue({ fieldId: "subsidiary", value: data.subsidiary });
        //日期
        const trandate = bsworks.date.stringToDate(data.trandate);
        journalRecord.setValue({ fieldId: "trandate", value: trandate });
        journalRecord.setValue({ fieldId: "postingperiod", value: data.postingperiod });
        journalRecord.setValue({ fieldId: "approvalstatus", value: 2 });
        if (data.department) {
            journalRecord.setValue({ fieldId: "department", value: data.department });
        }
        journalRecord.setValue({ fieldId: "memo", value: data.memo });

        const subdataList = data.subdataList;
        subdataList.forEach(subdata => {
            journalRecord.selectNewLine({ sublistId: "line" });
            journalRecord.setCurrentSublistValue({ sublistId: "line", fieldId: "account", value: subdata.account });
            if ("credit" == subdata.type) {
                journalRecord.setCurrentSublistValue({ sublistId: "line", fieldId: "credit", value: subdata.amount });
            } else {
                journalRecord.setCurrentSublistValue({ sublistId: "line", fieldId: "debit", value: subdata.amount });
            }
            journalRecord.setCurrentSublistValue({ sublistId: "line", fieldId: "department", value: subdata.department });
            journalRecord.setCurrentSublistValue({ sublistId: "line", fieldId: "location", value: subdata.location });
            journalRecord.commitLine({ sublistId: "line" });
        })
        const internalid = journalRecord.save({ ignoreMandatoryFields: true });
        return internalid;
    }

    const onRequest = (context) => {
        //参数值
        var requestBody = context.request.body;
        if (!bsworks.isNullOrEmpty(requestBody)) {
            let responseObject = bsworks.https.getSuccessResponse();
            try {
                requestBody = JSON.parse(requestBody);
                if (requestBody.type == "doGetAccountItem") {
                    responseObject = doGetAccountItem(requestBody.data);
                } else if (requestBody.type == "doJournalSetting") {
                    responseObject = doJournalSetting(requestBody.data);
                }

            } catch (e) {
                log.debug("onRequest", e);
                responseObject.status = "fail";
                responseObject.message = e.message;
            }
            context.response.write(JSON.stringify(responseObject));
        } else {
            renderPage(context);
        }
    }


    return {
        onRequest
    }

});