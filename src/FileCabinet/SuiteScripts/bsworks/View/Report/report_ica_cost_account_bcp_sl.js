/**
 * 半成品成本构成明细表 sl脚本
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(["../../plugin/bsworks/bsworksUtil-2.0", "../Plat/bws_plat_common", "N/ui/serverWidget", "N/task", "N/format", "N/search", "N/runtime"],
    (bsworks, platCommon, serverWidget, task, format, search, runtime) => {


        const renderPage = (context) => {
            //参数默认值
            const endDate = bsworks.date(format).getCurrentDate();
            const startDate = bsworks.date(format).getCurrentDate(null, null, -1);
            let defaultValues = {
                // custpage_filter_start_date: startDate,
                // custpage_filter_end_date: endDate,
                custpage_bomtype: "2",
                custpage_location: "68",
                custpage_subsidiary: runtime.getCurrentUser().subsidiary
            };
            //参数值
            var parameters = context.request.parameters;
            const params = bsworks.suitelet().getRequestParamters(parameters, defaultValues);
            defaultValues = handleDefaultValues(params.defaultValues, params.pageInit);
            // log.debug("defaultValues", defaultValues)

            /**
            * suitelet表单配置
            */
            const suiteletConfig = {
                title: "半成品成本构成明细表",
                scriptConfig: {
                    scriptModulePath: "/SuiteScripts/bsworks/View/Report/",
                    suiteletScriptName: "report_ica_cost_acc_bcp_sl",
                    clientScriptModuleName: "bws_report_common_cs"
                },
                fieldGroupConfig: [
                    {
                        id: "custpage_fieldgroup_filter", label: "过滤器", isFilterGroup: true,
                        fields: [
                            { id: "custpage_subsidiary", label: "子公司", type: "select", source: "subsidiary", required: true },
                            { id: "custpage_tranid", label: "完工单号", type: "select", source: "assemblybuild" },
                            { id: "custpage_filter_start_date", label: "开始日期", type: "date", required: true },
                            { id: "custpage_filter_end_date", label: "结束日期", type: "date", required: true },
                            { id: "custpage_item", label: "货品编号", type: "select", source: "assemblyitem" },
                            { id: "custpage_location", label: "地点", type: "select", source: "location" },
                            { id: "custpage_bomtype", label: "BOM类型", type: "select", selectOptions: [{ value: "2", text: "自制" }, { value: "3", text: "外协" }] },
                        ],
                        buttons: []
                    }
                ],
                sublistConfig: [
                    {
                        id: bsworks.constant.suitelet.SUBLIST_ID, label: "核算明细",
                        hasCheckbox: true, hasSummary: false, hasHeaderSort: true,
                        addMarkAllButtons: false,
                        fields: [
                            { id: "custbody_ca_cost_allocationed", label: "已分摊", type: "checkbox", displayType: "disabled" },
                            { id: "tranid", label: "完工单号" },
                            { id: "createdfrom_display_name", label: "工单号" },
                            { id: "trandate", label: "完工日期" },
                            { id: "bomtype_display_name", label: "BOM类型" },
                            { id: "item_display_name", label: "货品编号" },
                            { id: "displayname", label: "货品名称" },
                            // { id: "item_category_display_name", label: "货品类型" },
                            { id: "custitem_hc_item_size", label: "规格型号" },
                            { id: "bom_name", label: "物料清单" },
                            { id: "bomrevision_name", label: "物料清单版本" },
                            { id: "unit", label: "单位" },
                            { id: "location_display_name", label: "地点" },
                            { id: "quantity", label: "数量" },
                            { id: "formulacurrency_1", label: "总材料成本" },
                            { id: "formulacurrency_2", label: "总直接人工" },
                            { id: "formulacurrency_3", label: "总制造费用" },
                            { id: "formulacurrency_4", label: "总外协费用" },
                            { id: "formulacurrency_1_unit", label: "单位材料成本", displayType: "disabled" },
                            { id: "formulacurrency_2_unit", label: "单位直接人工", displayType: "disabled" },
                            { id: "formulacurrency_3_unit", label: "单位制造费用", displayType: "disabled" },
                            { id: "formulacurrency_4_unit", label: "单位外协费用", displayType: "disabled" },
                            { id: "total_unitcost", label: "总单位成本", displayType: "disabled" },
                            { id: "internalid", label: "装配件构建ID", displayType: "hidden" },
                            { id: "wointernalid", label: "工单ID", displayType: "hidden" },
                            { id: "item", label: "货品ID", displayType: "hidden" },
                            { id: "bomtype", label: "BOM类型ID", displayType: "hidden" },
                            { id: "bom_internalid", label: "物料清单ID", displayType: "hidden" },
                            { id: "bomrevision_internalid", label: "物料清单版本ID", displayType: "hidden" },
                            { id: "location", label: "地点ID", displayType: "hidden" },
                            { id: "unitid", label: "单位ID", displayType: "hidden" },
                            { id: "subsidiary", label: "子公司ID", displayType: "hidden" },
                        ],
                        buttons: [
                            { id: "custpage_button_checked_all", label: "全&nbsp;&nbsp;选", addEventListener: true },
                        ],
                    }
                ],
                customPageScript: null
            }


            //查询明细列表数据
            const subdataObj = {};
            if (!params.pageInit) {
                const subDataList = doSearchSublistDataList(defaultValues);
                subdataObj[suiteletConfig.sublistConfig[0].id] = subDataList;

            }
            const formObj = bsworks.suitelet(serverWidget).form.create(suiteletConfig, defaultValues, subdataObj);
            const form = formObj.form;


            form.addButton({
                id: "custpage_cal_unitcost_button",
                label: "计算单位成本",
            });

            form.addButton({
                id: "custpage_save_cost_button",
                label: "记录产品成本",
            });

            context.response.writePage(form);

        }

        /**
       * 查询明细列表数据
       * @param {*} defaultValues 
       * @returns 
       */
        const doSearchSublistDataList = (defaultValues) => {
            log.debug("defaultValues", defaultValues)
            const searchFields = [
                { id: "subsidiary", label: "子公司", search: { type: "valueText" }, filter: { values: defaultValues.custpage_subsidiary } },
                { id: "custrecord_hc_bom_type", alias: "bomtype", label: "BOM类型", search: { type: "valueText" }, join: "bom", filter: { values: defaultValues.custpage_bomtype } },
                { id: "internalid", label: "完工单号", filter: { values: defaultValues.custpage_tranid } },
                { id: "createdfrom", label: "工单号", search: { type: "valueText" } },
                { id: "item", label: "货品", search: { type: "valueText" }, filter: { values: defaultValues.custpage_item } },
                { id: "trandate", label: "日期", filter: { operator: "within", values: defaultValues.custpage_filter_date } },
                { id: "location", label: "地点", search: { type: "valueText" }, filter: { values: defaultValues.custpage_location } },
                { id: "name", alias: "bom_name", label: "物料清单", join: "bom" },
                { id: "name", alias: "bomrevision_name", label: "物料清单版本", join: "bomrevision" },
                { id: "internalid", alias: "bom_internalid", label: "物料清单内部ID", join: "bom" },
                { id: "internalid", alias: "bomrevision_internalid", label: "物料清单版本内部ID", join: "bomrevision" },
                { id: "internalid", alias: "wointernalid", label: "创建自工单内部ID", join: "createdfrom" },
                { id: "unitid", label: "单位ID" }
            ];
            let resultDataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_ica_item_cost_account_data", searchFields, 1, 1000);
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
            //装配件构建ID集合
            const assemblybuildIds = [];
            //工单ID集合
            const workorderIds = [];
            resultDataList.forEach(rdata => {
                if (rdata.internalid && assemblybuildIds.indexOf(rdata.internalid) == -1) {
                    assemblybuildIds.push(rdata.internalid);
                }
                if (rdata.wointernalid && workorderIds.indexOf(rdata.wointernalid) == -1) {
                    workorderIds.push(rdata.wointernalid);
                }
            })

            //Search：ICA 产品成本核算金额
            const searchFields = [
                { id: "internalid", label: "装配件构建内部ID", search: { summary: "group" }, filter: { operator: "anyof", values: assemblybuildIds } },
                { id: "internalid", alias: "wointernalid", label: "创建自工单内部ID", search: { summary: "group" }, join: "createdfrom" }
            ];
            const accountAmountDataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_ica_item_cost_accou_amount", searchFields, 1, 1000);
            // log.debug("accountAmountDataList", accountAmountDataList);

            const newdataList = resultDataList.map((data) => {
                data.custbody_ca_cost_allocationed = data.custbody_ca_cost_allocationed ? "T" : "F";
                //相同装配件构建ID、货品、规格型号、单位、地点
                const accountAmountData = accountAmountDataList.find(adata => data.internalid == adata.internalid && data.item == adata.item
                    && data.bomtype == adata.custrecord_hc_bom_type);

                if (accountAmountData) {
                    data.formulacurrency_1 = accountAmountData.formulacurrency_1;
                    data.formulacurrency_2 = accountAmountData.formulacurrency_2;
                    data.formulacurrency_3 = accountAmountData.formulacurrency_3;
                    data.formulacurrency_4 = accountAmountData.formulacurrency_4;
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
            if (!pageInit) {

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