/**
 * 生产成本分摊工作台 sl脚本
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(["../../plugin/bsworks/bsworksUtil-2.0", "./bws_plat_common", "N/ui/serverWidget", "N/task", "N/format", "N/search", "N/runtime", "N/record"],
    (bsworks, platCommon, serverWidget, task, format, search, runtime, record) => {

        var subsidiaryOptions = [];
        var accountingbookOptions = [];
        var sharetypeOptions = [];

        var total_direct_labor = 0; //总直接人工
        var total_manufac_expense = 0; //总制造费用
        var relation_account_amount = 0; //关联工费科目余额
        var total_woquantity = 0;//总完工数量
        var total_machine_hours = 0;//总机器工时
        var total_person_hours = 0;//总人工工时


        /**
        * 获取成本分摊记录数据
        * @returns 
        */
        const getWoCostShareRecord = () => {
            const searchFields = [
                { id: "internalid", alias: "value", search: { sort: "DESC" } },
                { id: "name", alias: "text" }
            ];
            const dataList = bsworks.search(search).getSearchResultDataList("customrecord_ca_cost_share_plat_record", searchFields, 1, 20);
            return dataList;
        }




        const renderPage = (context) => {
            //参数默认值
            const endDate = bsworks.date(format).getCurrentDate();
            const startDate = bsworks.date(format).getCurrentDate(null, null, -3);
            let defaultValues = {
                custpage_filter_start_date: startDate,
                custpage_filter_end_date: endDate,
                custpage_bomtype: ["2"]
            };
            //参数值
            var parameters = context.request.parameters;
            const params = bsworks.suitelet().getRequestParamters(parameters, defaultValues);
            defaultValues = handleDefaultValues(params.defaultValues, params.pageInit);
            // log.debug("defaultValues", defaultValues)

            //成本分摊记录数据
            const shareItemOptions = getWoCostShareRecord();



            /**
            * suitelet表单配置
            */
            const suiteletConfig = {
                title: "成本分摊工作台",
                scriptConfig: {
                    scriptModulePath: "/SuiteScripts/bsworks/View/Plat/",
                    suiteletScriptName: "plat_ca_cost_share_sl",
                    clientScriptModuleName: "bws_plat_common_cs"
                },
                fieldGroupConfig: [
                    {
                        id: "custpage_fieldgroup_filter", label: "过滤器", isFilterGroup: true,
                        fields: [
                            { id: "custpage_subsidiary", label: "子公司", type: "select", selectOptions: subsidiaryOptions, required: true },
                            { id: "custpage_accountingperiod", label: "会计期间", type: "select", source: "accountingperiod", required: true },
                            { id: "custpage_share_type", label: "分摊方式", type: "select", selectOptions: sharetypeOptions, required: true, showEmptyItem: false },
                            { id: "custpage_accountingbook", label: "会计账簿", type: "select", selectOptions: accountingbookOptions, showEmptyItem: false },
                            { id: "custpage_share_status", label: "分摊状态", type: "select", selectOptions: [{ value: "F", text: "待分摊" }, { value: "T", text: "已分摊" }] },
                            { id: "custpage_bomtype", label: "BOM类型", type: "multiselect", source: "customlist_hc_bom_type", required: true },
                            { id: "custpage_share_record", label: "月末分摊记录", type: "select", selectOptions: shareItemOptions },
                        ],
                        buttons: []
                    },
                    {
                        id: "custpage_fieldgroup_datasum", label: "数据汇总",
                        fields: [
                            { id: "custpage_total_direct_labor", label: "总直接人工", displayType: "disabled" },
                            { id: "custpage_total_manufac_expense", label: "总制造费用", displayType: "disabled" },
                            { id: "custpage_person_expense", label: "单位人工成本", displayType: "disabled" },
                            { id: "custpage_manufac_expense", label: "单位制造费用", displayType: "disabled" },
                            { id: "custpage_account_balance", label: "关联工费科目余额", displayType: "disabled", required: true },
                            { id: "custpage_total_woquantity", label: "总完工数量", displayType: "disabled" },
                            { id: "custpage_total_machine_hours", label: "总机器工时", displayType: "disabled" },
                            { id: "custpage_total_person_hours", label: "总人工工时", displayType: "disabled" }
                        ],
                        buttons: []
                    },
                ],
                sublistConfig: [
                    {
                        id: bsworks.constant.suitelet.SUBLIST_ID, label: "完工明细",
                        hasCheckbox: true, hasSummary: false, hasHeaderSort: true,
                        addMarkAllButtons: false,
                        fields: [
                            { id: "custbody_ca_quota_allocation_build", label: "定额分配", type: "checkbox", displayType: "entry" },
                            { id: "custbody_ca_cost_allocationed", label: "已分摊", type: "checkbox", displayType: "disabled" },
                            { id: "type_display_name", label: "单据类型" },
                            { id: "createdfrom_display_name", label: "工单号" },
                            { id: "tranid", label: "完工单号" },
                            { id: "trandate", label: "完工日期" },
                            // { id: "bomtype_display_name", label: "BOM类型" },
                            { id: "item_display_name", label: "货品编号" },
                            { id: "displayname", label: "货品名称" },
                            { id: "item_category_display_name", label: "货品类型" },
                            // { id: "custitem_hc_item_size", label: "规格型号" },
                            { id: "quantity", label: "完工数量" },
                            { id: "unit", label: "工单单位" },
                            { id: "location_display_name", label: "地点" },
                            { id: "custbody_ca_machine_hour", label: "完工机器工时" },
                            { id: "custbody_ca_person_hour", label: "完工人工工时" },
                            { id: "custpage_ca_machine_cost", label: "分摊制造费用", displayType: "entry" },
                            { id: "custpage_ca_person_cost", label: "分摊直接人工", displayType: "entry" },
                            { id: "custpage_ca2_total_cail_cost", label: "总材料成本" },
                            { id: "custpage_ca2_total_person_cost", label: "总直接人工" },
                            { id: "custpage_ca2_total_machine_cost", label: "总制造费用" },
                            { id: "custpage_ca2_cail_cost", label: "单位材料成本" },
                            { id: "custpage_ca2_person_cost", label: "单位直接人工" },
                            { id: "custpage_ca2_machine_cost", label: "单位制造费用" },
                            { id: "custpage_ca_machine_cost_old", label: "原始分摊制造费用", displayType: "hidden" },
                            { id: "custpage_ca_person_cost_old", label: "原始分摊直接人工", displayType: "hidden" },
                            { id: "custbody_calc_cost", label: "计算成本", type: "checkbox", displayType: "hidden" },
                            { id: "internalid", label: "装配件构建ID", displayType: "hidden" },
                        ],
                        buttons: [
                            { id: "custpage_button_checked_all", label: "全&nbsp;&nbsp;选", addEventListener: true },
                            { id: "custpage_calcost_button", label: "计算成本" }
                        ],
                    }
                ],
                customPageScript: null
            }

            //分摊方式：实施工时占比
            if (defaultValues.custpage_share_type == "3") {
                suiteletConfig.sublistConfig.push({
                    id: "custpage_sublist_checkhours", label: "工时检查",
                    hasCheckbox: false, hasSummary: false, hasHeaderSort: true,
                    addMarkAllButtons: false,
                    fields: [
                        { id: "custpage_createdfrom_display_name", label: "工单号" },
                        { id: "custpage_tranid", label: "完工单号" },
                        { id: "custpage_trandate", label: "完工日期" },
                        { id: "custpage_item_display_name", label: "货品编号" },
                        { id: "custpage_displayname", label: "货品名称" },
                        { id: "custpage_quantity", label: "完工数量" },
                        { id: "custpage_ca_machine_hour", label: "完工机器工时" },
                        { id: "custpage_ca_person_hour", label: "完工人工工时" },

                    ],
                    buttons: [],
                });
            }

            //查询明细列表数据
            const subdataObj = {};
            if (!params.pageInit) {
                const subDataList = doSearchSublistDataList(defaultValues);
                let subdataList0 = subDataList;
                let subdataList1 = [];
                //分摊方式：实施工时占比
                if (defaultValues.custpage_share_type == "3") {
                    subdataList0 = [];
                    let line_num = 0;
                    subDataList.forEach(subdata => {
                        if (subdata.custbody_ca_person_hour != "" && subdata.custbody_ca_person_hour != null) {
                            subdataList0.push(subdata);
                        } else {
                            const newsubdata = {
                                sublist_line_num1: ++line_num,
                                custpage_createdfrom_display_name: subdata.createdfrom_display_name,
                                custpage_tranid: subdata.tranid,
                                custpage_trandate: subdata.trandate,
                                custpage_item_display_name: subdata.item_display_name,
                                custpage_displayname: subdata.displayname,
                                custpage_quantity: subdata.quantity
                            }
                            subdataList1.push(newsubdata);
                        }
                    })
                    subdataObj[suiteletConfig.sublistConfig[1].id] = subdataList1;
                }
                subdataObj[suiteletConfig.sublistConfig[0].id] = subdataList0;

            }
            const formObj = bsworks.suitelet(serverWidget).form.create(suiteletConfig, defaultValues, subdataObj);
            const form = formObj.form;

            form.getField({ id: "custpage_total_direct_labor" }).defaultValue = total_direct_labor;
            form.getField({ id: "custpage_total_manufac_expense" }).defaultValue = total_manufac_expense;
            form.getField({ id: "custpage_account_balance" }).defaultValue = relation_account_amount;
            form.getField({ id: "custpage_total_woquantity" }).defaultValue = total_woquantity;
            form.getField({ id: "custpage_total_machine_hours" }).defaultValue = total_machine_hours;
            form.getField({ id: "custpage_total_person_hours" }).defaultValue = total_person_hours;


            let submitLabel = "执行分摊";
            if (defaultValues.custpage_share_record) {
                //有分摊记录明细行数据，则继续分摊
                const shareRecordObj = record.load({ type: "customrecord_ca_cost_share_plat_record", id: defaultValues.custpage_share_record });
                const lineCount = shareRecordObj.getLineCount({ sublistId: "recmachcustrecord_ca_cost_share_record_mid" });
                if (lineCount > 0) {
                    submitLabel = "继续分摊";
                } else {
                    form.getField({ id: "custpage_share_record" }).defaultValue = "";
                }
            }

            form.addSubmitButton({
                label: submitLabel
            });

            form.addButton({
                id: "custpage_cancel_share_button",
                label: "取消分摊",
            });

            form.addButton({
                id: "custpage_update_wochours_button",
                label: "更新完工单位工时",
            });

            context.response.writePage(form);

        }

        /**
       * 查询明细列表数据
       * @param {*} defaultValues 
       * @returns 
       */
        const doSearchSublistDataList = (defaultValues) => {
            const searchFields = [
                { id: "subsidiary", label: "子公司", search: { type: "text" }, filter: { values: defaultValues.custpage_subsidiary } },
                { id: "postingperiod", label: "过账期间", search: { type: "none" }, filter: { values: defaultValues.custpage_accountingperiod } },
                { id: "custrecord_hc_bom_type", alias: "bomtype", label: "BOM类型", search: { type: "valueText" }, join: "bom", filter: { operator: "anyof", values: defaultValues.custpage_bomtype } },
                { id: "custbody_ca_cost_allocationed", label: "分摊状态", filter: { values: defaultValues.custpage_share_status } },
                { id: "type", label: "单据类型", search: { type: "valueText" } },
                { id: "createdfrom", label: "工单号", search: { type: "valueText" } },
                { id: "item", label: "货品", search: { type: "valueText" } },
                { id: "custbody_item_catogory", alias: "item_category", label: "货品类型", search: { type: "valueText" } },
                // { id: "trandate", label: "日期", filter: { operator: "within", values: defaultValues.custpage_filter_date } },
                { id: "location", label: "地点", join: 'createdfrom', search: { type: "valueText" } },
                // { id: "line", label: "行号" },
            ];
            let resultDataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_ca_build_qty_static", searchFields, 1, 1000);
            if (0 == resultDataList.length) return resultDataList;
            //处理数据
            resultDataList = handleSubdataList(resultDataList, defaultValues);
            return resultDataList;
        }


        /**
         * 处理数据
         * @param {*} resultDataList 
         * @param {*} defaultValues 
         * @returns 
         */
        const handleSubdataList = (resultDataList, defaultValues) => {

            //已有的分摊制造费用和分摊直接人工
            const assemblybuildIds = [];
            resultDataList.forEach(rdata => {
                if (rdata.internalid && assemblybuildIds.indexOf(rdata.internalid) == -1) {
                    assemblybuildIds.push(rdata.internalid);
                }

            })
            //分摊货品
            const costitems = platCommon.getAssemblybuildCostItem();
            const searchFields = [
                { id: "mainline", search: { type: 'none' }, filter: { values: "F" } },
                { id: "quantityuom", label: "事务处理数量" },
                { id: "item", label: "货品", filter: { operator: "anyof", values: Object.keys(costitems) } },
                { id: "custbody_ca_cost_allocationed", label: "已分摊", filter: { values: "T" } },
                { id: "internalid", label: "内部ID", filter: { operator: "anyof", values: assemblybuildIds } }
            ];
            const buildDataList = bsworks.search(search).getSearchAllResultDataList("assemblybuild", searchFields, 1, 1000);

            const buildCostItemQuantity = {};
            buildDataList.forEach(bdata => {
                if (null == buildCostItemQuantity[bdata.internalid]) {
                    buildCostItemQuantity[bdata.internalid] = { custpage_ca_machine_cost: "", custpage_ca_person_cost: "" };
                }
                buildCostItemQuantity[bdata.internalid][costitems[bdata.item]] = Math.abs(bdata.quantityuom || 0);
            })
            // log.debug("buildCostItemQuantity", buildCostItemQuantity);

            //计算自制半成品料工费
            const searchFields2 = [
                { id: "internalid", label: "装配件构建ID", filter: { operator: "anyof", values: assemblybuildIds } },
                { id: "internalid", alias: "wo_internalid", label: "工单ID", join: "createdfrom" }
            ];
            const costAmountList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_ca_item_cost_accou_amount", searchFields2, 1, 1000);
            // log.debug("costAmountList", costAmountList)

            const newdataList = resultDataList.map((data) => {
                data.custbody_ca_quota_allocation_build = data.custbody_ca_quota_allocation_build ? "T" : "F";
                data.custbody_ca_cost_allocationed = data.custbody_ca_cost_allocationed ? "T" : "F";
                //以下数据勾选后计算
                // total_woquantity = parseFloat(total_woquantity) + parseFloat(data.quantity || 0);
                // total_machine_hours = parseFloat(total_machine_hours) + parseFloat(data.custbody_ca_machine_hour || 0);
                // total_person_hours = parseFloat(total_person_hours) + parseFloat(data.custbody_ca_person_hour || 0);

                if (buildCostItemQuantity[data.internalid]) {
                    data.custpage_ca_machine_cost = buildCostItemQuantity[data.internalid]["custpage_ca_machine_cost"];
                    data.custpage_ca_person_cost = buildCostItemQuantity[data.internalid]["custpage_ca_person_cost"];
                    data.custpage_ca_machine_cost_old = data.custpage_ca_machine_cost;
                    data.custpage_ca_person_cost_old = data.custpage_ca_person_cost;
                }
                //料工费
                const costData = costAmountList.find(cdata => cdata.internalid == data.internalid);
                if (costData) {
                    //总材料成本
                    data.custpage_ca2_total_cail_cost = costData.formulacurrency_1;
                    //总直接人工
                    data.custpage_ca2_total_person_cost = costData.formulacurrency_2;
                    //总制造费用
                    data.custpage_ca2_total_machine_cost = costData.formulacurrency_3;
                    //单位材料成本
                    data.custpage_ca2_cail_cost = ((parseFloat(data.custpage_ca2_total_cail_cost) || 0) / parseFloat(data.quantity)).toFixed(2);
                    //单位直接人工
                    data.custpage_ca2_person_cost = ((parseFloat(data.custpage_ca2_total_person_cost) || 0) / parseFloat(data.quantity)).toFixed(2);
                    //单位制造费用
                    data.custpage_ca2_machine_cost = ((parseFloat(data.custpage_ca2_total_machine_cost) || 0) / parseFloat(data.quantity)).toFixed(2);

                }
                return data;
            })
            // log.debug("newdataList", newdataList);
            return newdataList;
        }


        /**
         * 默认值处理
         * @param {*} defaultValues 
         * @returns 
         */
        const handleDefaultValues = (defaultValues, pageInit) => {
            if (!defaultValues.custpage_subsidiary) {
                defaultValues.custpage_subsidiary = runtime.getCurrentUser().subsidiary;
            }
            if (defaultValues.custpage_bomtype) {
                const bomtypeList = defaultValues.custpage_bomtype;
                defaultValues.custpage_bomtype = bomtypeList.filter(btype => btype != "");
            }

            //查询分摊规则配置表
            const searchFields = [
                { id: "isinactive", search: { type: "none", filter: { values: "F" } } },
                { id: "custrecord_ca_rules_subsidiary", alias: "subsidiary", label: "子公司", search: { type: "valueText", summary: "group" }, filter: { vlaues: defaultValues.custpage_subsidiary } },
                { id: "custrecord_ca_rules_accountbook", alias: "accountbook", label: "会计账簿", search: { type: "valueText", summary: "group" } },
                { id: "custrecord_ca_rules_allocation_method", alias: "sharetype", label: "分摊方式", search: { type: "valueText", summary: "group" } }
            ];
            const searchdataList = bsworks.search(search).getSearchAllResultDataList("customrecord_ca_allocation_rules_config", searchFields, 1, 1000);
            searchdataList.forEach(data => {
                const subsidiaryObj = subsidiaryOptions.find(sdata => sdata.value == data.subsidiary);
                if (!subsidiaryObj) {
                    subsidiaryOptions.push({ value: data.subsidiary, text: data.subsidiary_display_name });
                }
                const accountingbookObj = accountingbookOptions.find(sdata => sdata.value == data.accountbook);
                if (!accountingbookObj) {
                    accountingbookOptions.push({ value: data.accountbook, text: data.accountbook_display_name });
                }
                const sharetypeObj = sharetypeOptions.find(sdata => sdata.value == data.sharetype);
                if (!sharetypeObj) {
                    sharetypeOptions.push({ value: data.sharetype, text: data.sharetype_display_name });
                }
            })
            if (!pageInit) {
                //总直接人工
                const searchFields1 = [
                    { id: "subsidiary", label: "子公司", filter: { values: defaultValues.custpage_subsidiary } },
                    { id: "postingperiod", label: "会计期间", filter: { values: defaultValues.custpage_accountingperiod } },
                ];
                const searchdataList1 = bsworks.savedSearch(search).getSearchResultDataList("customsearch_ca_total_direct_labor", searchFields1, 1, 10);
                if (searchdataList1.length > 0) {
                    total_direct_labor = searchdataList1[0].formulacurrency_1 || 0;
                }
                //总制造费用
                const searchFields2 = [
                    { id: "subsidiary", label: "子公司", filter: { values: defaultValues.custpage_subsidiary } },
                    { id: "postingperiod", label: "会计期间", filter: { values: defaultValues.custpage_accountingperiod } },
                ];
                const searchdataList2 = bsworks.savedSearch(search).getSearchResultDataList("customsearch_ca_total_manufac_expense", searchFields2, 1, 10);
                if (searchdataList2.length > 0) {
                    total_manufac_expense = searchdataList2[0].formulacurrency_1 || 0;
                }
                // log.debug("searchdataList2", searchdataList2);

                //关联工费科目余额-根据子公司和会计科目过滤
                const searchFields3 = [
                    { id: "custrecord_ca_ai_subsidiary", label: "子公司", filter: { values: defaultValues.custpage_subsidiary } },
                    { id: "custrecord_ca_ai_account_period", alias: "accountbook", label: "会计期间", filter: { values: defaultValues.custpage_accountingperiod } },
                ];
                const searchdataList3 = bsworks.savedSearch(search).getSearchResultDataList("customsearch_ca_relation_account_amount", searchFields3, 1, 10);
                if (searchdataList3.length > 0) {
                    relation_account_amount = searchdataList3[0].name;
                }
            }

            return defaultValues;
        }

        const onRequest = (context) => {
            //参数值
            var requestBody = context.request.body;
            if (!bsworks.isNullOrEmpty(requestBody)) {
                let responseObject = bsworks.https().getSuccessResponse();
                try {
                    requestBody = JSON.parse(requestBody);
                    responseObject = platCommon.onRequest(requestBody, task);
                } catch (e) {
                    log.error("onRequest", e);
                    responseObject.status = "fail";
                    responseObject.message = e.message;
                }
                context.response.write(JSON.stringify(responseObject));
            } else {
                renderPage(context);
            }
        }

        return {
            onRequest: onRequest
        }
    });