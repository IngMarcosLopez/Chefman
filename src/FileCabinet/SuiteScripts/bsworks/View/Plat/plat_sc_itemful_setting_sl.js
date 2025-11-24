/**
 * 销货成本结转工作台 sl脚本
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(["../../plugin/bsworks/bsworksUtil-2.0", "./bws_plat_common", "N/ui/serverWidget", "N/task", "N/format", "N/search", "N/runtime"],
    (bsworks, platCommon, serverWidget, task, format, search, runtime) => {

        let postingperiodOptions = [];

        const renderPage = (context) => {
            //参数默认值
            // const endDate = bsworks.date(format).getCurrentDate();
            // const startDate = bsworks.date(format).getCurrentDate(null, null, -3);
            let defaultValues = {
                // custpage_filter_start_date: startDate,
                // custpage_filter_end_date: endDate,
                // custpage_costsetting: "T"
            };
            //参数值
            var parameters = context.request.parameters;
            const params = bsworks.suitelet().getRequestParamters(parameters, defaultValues);

            //过账期间过滤器数据集
            postingperiodOptions = getAccountingperiodOptions();
            defaultValues = handleDefaultValues(params.defaultValues, params.pageInit);
            // log.debug("defaultValues", defaultValues)

            const invoiceOptions = platCommon.getScRelationTransaction(defaultValues.custpage_accountingperiod);


            /**
            * suitelet表单配置
            */
            const suiteletConfig = {
                title: "销货成本结转工作台",
                scriptConfig: {
                    scriptModulePath: "/SuiteScripts/bsworks/View/Plat/",
                    suiteletScriptName: "plat_sc_itemful_setting_sl",
                    clientScriptModuleName: "bws_plat_common_cs"
                },
                fieldGroupConfig: [
                    {
                        id: "custpage_fieldgroup_filter", label: "过滤器", isFilterGroup: true,
                        fields: [
                            { id: "custpage_subsidiary", label: "子公司", type: "select", source: "subsidiary", required: true },
                            { id: "custpage_accountingperiod", label: "会计期间", type: "select", selectOptions: postingperiodOptions, required: true, showEmptyItem: false },
                            { id: "custpage_invoice", label: "发票号", type: "select", selectOptions: invoiceOptions, required: false, showEmptyItem: false },
                            { id: "custpage_costsetting", label: "成本已结转", type: "select", selectOptions: [{ value: "T", text: "是" }, { value: "F", text: "否" }] },
                            // { id: "custpage_filter_start_date", label: "开票开始日期", type: "date" },
                            // { id: "custpage_filter_end_date", label: "开票结束日期", type: "date" },
                        ],
                        buttons: []
                    }
                ],
                sublistConfig: [
                    {
                        id: bsworks.constant.suitelet.SUBLIST_ID, label: "发票明细",
                        hasCheckbox: true, hasSummary: true, hasHeaderSort: true,
                        addMarkAllButtons: false,
                        fields: [
                            { id: "custrecord_sc_relation_invo_carry_over", label: "已结转", type: "checkbox", displayType: "disabled" },
                            { id: "tranid", label: "出库单号", },
                            { id: "trandate_itemful", label: "出库日期" },
                            { id: "createdfrom_display_name", label: "销售单号" },
                            { id: "item_display_name", label: "货品编号" },
                            { id: "displayname", label: "货品名称" },
                            { id: "custitem_hc_item_size", label: "规格型号" },
                            { id: "quantity", label: "出库数量", summary: true },
                            { id: "internalid_invoice_display_name", label: "发票号" },
                            { id: "custrecord_sc_relation_invoice_date", label: "开票日期", type: "date" },
                            { id: "custrecord_sc_relation_invoice_qty", label: "开票数量", summary: true },
                            { id: "item_setting_display_name", label: "成本结转货品编号" },
                            { id: "cogsamount", label: "销货成本总额", type: "currency" },
                            { id: "settingamount", label: "结转成本金额", type: "currency", summary: true },
                            { id: "internalid", label: "出库单ID", displayType: "hidden" },
                            { id: "internalid_invoice", label: "发票ID", displayType: "hidden" },
                            { id: "item", label: "货品ID", displayType: "hidden" },
                            { id: "item_setting", label: "成本结转货品编号", displayType: "hidden" },
                            { id: "createdfrom", label: "销售订单ID", displayType: "hidden" },
                            { id: "sc_reltranaction_internalid", label: "SC事务处理关联发票内部ID", displayType: "hidden" },
                            { id: "solineid", label: "行唯一键" },
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
            form.addSubmitButton({
                label: "提交结转",
            });

            context.response.writePage(form);

        }

        /**
       * 查询明细列表数据
       * @param {*} defaultValues 
       * @returns 
       */
        const doSearchSublistDataList = (defaultValues) => {

            //查询出库单关联开票信息
            let searchFields = [
                { id: "internalid", alias: "sc_reltranaction_internalid", label: "SC事务处理关联发票内部ID" },
                { id: "custrecord_sc_relation_transaction", alias: "internalid", label: "出库单ID", search: { type: "valueText" } },
                { id: "custrecord_sc_relation_invoice_number", alias: "internalid_invoice", label: "销售发票ID", search: { type: "valueText" }, filter: { values: defaultValues.custpage_invoice } },
                { id: "mainline", join: "custrecord_sc_relation_invoice_number", filter: { values: "T" } },
                { id: "subsidiary", label: "子公司", join: "custrecord_sc_relation_invoice_number", search: { type: "valueText" }, filter: { values: defaultValues.custpage_subsidiary } },
                { id: "trandate", alias: "custrecord_sc_relation_invoice_date", label: "开票日期", join: "custrecord_sc_relation_invoice_number", filter: { operator: "within", values: defaultValues.custpage_filter_date } },
                { id: "createdfrom", label: "销售订单号", join: "custrecord_sc_relation_invoice_number", search: { type: "valueText" } },
                { id: "custbody_sc_over_cost_amount", alias: "settingamount", label: "结转成本金额", join: "custrecord_sc_relation_invoice_number" },
                { id: "custbody_sc_cogs_carry_over", alias: "custrecord_sc_relation_invo_carry_over", label: "成本已结转", join: "custrecord_sc_relation_invoice_number", filter: { values: defaultValues.custpage_costsetting } },
                { id: "approvalstatus", label: "审批状态", search: { type: "none" }, join: "custrecord_sc_relation_invoice_number", filter: { values: "2" } },
                { id: "custrecord_sc_relation_item_code", alias: "item_setting", label: "成本结转货品编号", search: { type: "valueText" } },
                { id: "custrecord_sc_relation_item_if_line", alias: "solineid", label: "成本结转货品行号" },
                { id: "custrecord_sc_relation_invoice_qty", label: "开票数量" },
                { id: "postingperiod", join: "custrecord_sc_relation_invoice_number", search: { type: "none" }, filter: { values: defaultValues.custpage_accountingperiod } }

            ];
            let resultDataList = bsworks.search(search).getSearchAllResultDataList("customrecord_sc_tran_relation_invoice", searchFields, 1, 1000);
            // const searchFields = [
            //     { id: "subsidiary", label: "子公司", search: { type: "valueText" }, filter: { values: defaultValues.custpage_subsidiary } },
            //     { id: "custrecord_sc_relation_invoice_number", alias: "internalid_invoice", label: "发票ID", join: "custrecord_sc_relation_transaction", search: { type: "valueText" }, filter: { values: defaultValues.custpage_invoice } },
            //     { id: "custrecord_sc_relation_item_code", alias: "item_setting", label: "成本结转货品编号", join: "custrecord_sc_relation_transaction", search: { type: "valueText" } },
            //     { id: "createdfrom", label: "销售订单号", search: { type: "valueText" } },
            //     { id: "internalid", alias: "sc_reltranaction_internalid", label: "SC 事务处理关联发票内部ID", join: "custrecord_sc_relation_transaction" },
            //     { id: "custrecord_sc_relation_invoice_date", label: "开票日期", join: "custrecord_sc_relation_transaction", filter: { operator: "within", values: defaultValues.custpage_filter_date } },
            //     { id: "custrecord_sc_relation_item_if_line", alias: "solineid", label: "成本结转货品行号", join: "custrecord_sc_relation_transaction" },
            //     { id: "custrecord_sc_relation_trans_cost_amout", alias: "settingamount", label: "结转成本金额", join: "custrecord_sc_relation_transaction" },
            //     { id: 'custrecord_sc_relation_invo_carry_over', label: "成本已结转", join: "custrecord_sc_relation_transaction", filter: { values: defaultValues.custpage_costsetting } },
            //     { id: "item", label: "货品", search: { type: "valueText" } }
            // ];
            // let resultDataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_sc_cogs_if_carry_over", searchFields, 1, 1000);
            if (0 == resultDataList.length) return resultDataList;
            // log.debug("resultDataList", resultDataList);

            //查询出库单数据
            const createdfroms = [];
            const internalids = [];
            resultDataList.forEach(rdata => {
                if (!createdfroms.includes(rdata.createdfrom)) {
                    createdfroms.push(rdata.createdfrom);
                }
                if (!internalids.includes(rdata.internalid)) {
                    internalids.push(rdata.internalid);
                }
            })
            searchFields = [
                { id: "mainline", search: { type: "none" }, filter: { values: "F" } },
                { id: "taxline", search: { type: "none" }, filter: { values: "F" } },
                { id: "internalid", search: { type: "none" }, label: "销售订单ID", filter: { operator: "anyof", values: createdfroms } },
                { id: "internalid", alias: "internalid_itemful", label: "出库单ID", join: "applyingtransaction", filter: { operator: "anyof", values: internalids } },
                { id: "item", label: "货品", search: { type: "valueText" }, },
                { id: "displayname", label: "显示名称", join: "item" },
                { id: "custitem_hc_item_size", label: "规格型号", join: "item" },
                { id: "quantityuom", alias: "quantity", label: "出库数量", join: "applyingtransaction" },
                { id: "custcol_line_unique_key", alias: "solineid", label: "行唯一键", join: "applyingtransaction" },
                { id: "cogsamount", label: "销货成本金额", join: "applyingtransaction" },
                { id: "trandate", alias: "trandate_itemful", label: "出库日期", join: "applyingtransaction" },
            ];
            let itemfulDataList = bsworks.search(search).getSearchAllResultDataList("salesorder", searchFields, 1, 1000);
            // log.debug("itemfulDataList", itemfulDataList);
            resultDataList = resultDataList.map(rdata => {
                const fuldata = itemfulDataList.find(idata => idata.internalid_itemful == rdata.internalid && idata.item == rdata.item_setting && idata.solineid == rdata.solineid);
                if (fuldata) {
                    rdata.item = fuldata.item;
                    rdata.item_display_name = fuldata.item_display_name;
                    rdata.displayname = fuldata.displayname;
                    rdata.custitem_hc_item_size = fuldata.custitem_hc_item_size;
                    rdata.quantity = fuldata.quantity;
                    rdata.cogsamount = fuldata.cogsamount;
                    rdata.trandate_itemful = fuldata.trandate_itemful;
                }
                return rdata;
            })

            //处理数据
            resultDataList = handleSubdataList(resultDataList, defaultValues);
            return resultDataList;
        }

        /**
         * 查询会计期间
         */
        const getAccountingperiodOptions = () => {
            const lastYearDate = bsworks.date(format).getCurrentDate(null, -1, -1);
            const searchFields = [
                { id: "isinactive", search: { type: "none" }, filter: { values: "F" } },
                { id: "isyear", label: "年度", search: { type: "none" }, filter: { values: "F" } },
                { id: "isquarter", label: "季度", search: { type: "none" }, filter: { values: "F" } },
                { id: "isadjust", label: "调整", search: { type: "none" }, filter: { values: "F" } },
                { id: "startdate", label: "开始日期", search: { type: "none" }, filter: { operator: "within", values: lastYearDate } },
                { id: "periodname", label: "期间名称" },
                { id: "internalid", label: "内部id", search: { sort: "ASC" } },
            ];
            const searchDataList = bsworks.search(search).getSearchAllResultDataList("accountingperiod", searchFields, 1, 1000);
            const options = [{ value: "", text: "" }];
            searchDataList.forEach(item => {
                options.push({ value: item.internalid, text: item.periodname });
            })
            return options;
        }
        /**
         * 处理数据
         * @param {*} resultDataList 
         * @param {*} defaultValues 
         * @returns 
         */
        const handleSubdataList = (resultDataList, defaultValues) => {
            resultDataList = resultDataList.map(rdata => {
                rdata.tranid = rdata.internalid_display_name;
                rdata.custrecord_sc_relation_invo_carry_over = rdata.custrecord_sc_relation_invo_carry_over ? "T" : "F";
                //结转成本金额 = 开票数量/出库数量*销货成本总额
                rdata.settingamount = ((parseFloat(rdata.custrecord_sc_relation_invoice_qty) / parseFloat(rdata.quantity)) * parseFloat(rdata.cogsamount)).toFixed(2);
                return rdata;
            })
            return resultDataList;
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
            // if (!defaultValues.custpage_accountingperiod) {
            //     //设置过账结算期间默认值为当月
            //     const nowDate = bsworks.date(format).getCurrentTimezoneDate();
            //     const year = nowDate.getFullYear();
            //     let month = nowDate.getMonth() + 1;
            //     if (month < 10) {
            //         month = "0" + month;
            //     } else {
            //         month = month + "";
            //     }
            //     let periodname = bsworks.constant.date.MONTH_ABBR_CAPITAL[month] + " " + year;
            //     const periodObj = postingperiodOptions.find(item => (item.text).toUpperCase() == periodname);
            //     if (periodObj) {
            //         defaultValues.custpage_accountingperiod = periodObj.value;
            //     }
            // }

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