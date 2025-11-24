/**
 * 出库单开票工作台 sl脚本
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(["../../plugin/bsworks/bsworksUtil-2.0", "./bws_plat_common", "N/ui/serverWidget", "N/task", "N/format", "N/search", "N/runtime", "N/record"],
    (bsworks, platCommon, serverWidget, task, format, search, runtime, record) => {

        let customerOptions = [];
        let salesorderOptions = [];

        const renderPage = (context) => {
            //参数默认值
            const endDate = bsworks.date(format).getCurrentDate();
            const startDate = bsworks.date(format).getCurrentDate(null, -1);
            let defaultValues = {
                custpage_filter_start_date: startDate,
                custpage_filter_end_date: endDate,
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
                title: "出库单开票工作台",
                scriptConfig: {
                    scriptModulePath: "/SuiteScripts/bsworks/View/Plat/",
                    suiteletScriptName: "plat_sc_itemful_invoice_sl",
                    clientScriptModuleName: "bws_plat_common_cs"
                },
                fieldGroupConfig: [
                    {
                        id: "custpage_fieldgroup_filter", label: "过滤器", isFilterGroup: true,
                        fields: [
                            { id: "custpage_subsidiary", label: "子公司", type: "select", source: "subsidiary", required: true },
                            { id: "custpage_customer", label: "客户", type: "select", selectOptions: customerOptions, required: true, showEmptyItem: false },
                            { id: "custpage_currency", label: "货币", type: "select", source: "currency", required: true },
                            { id: "custpage_salesorder", label: "销售订单号", type: "select", selectOptions: salesorderOptions, required: true, showEmptyItem: false },
                            { id: "custpage_filter_start_date", label: "开始日期", type: "date" },
                            { id: "custpage_filter_end_date", label: "结束日期", type: "date" },
                        ],
                        buttons: []
                    }
                ],
                sublistConfig: [
                    {
                        id: bsworks.constant.suitelet.SUBLIST_ID, label: "完工明细",
                        hasCheckbox: true, hasSummary: true, hasHeaderSort: true,
                        addMarkAllButtons: false,
                        fields: [
                        //    { id: "subsidiary_display_name", label: "子公司", },
                        //    { id: "mainname_display_name", label: "客户", },
                            { id: "trandate", label: "出库日期", type: "date" },
                            { id: "internalid_display_name", label: "出库单号" },
                            { id: "createdfrom_display_name", label: "销售单号" },
                            { id: "item_display_name", label: "货品编号" },
                            { id: "custcol_hc_item_name", label: "货品名称" },
                            { id: "custcol_hc_item_size", label: "规格型号" },
                            { id: "currency_display_name", label: "货币" },
                            { id: "quantity", label: "出库数量" },
                            { id: "quantity_invoice", label: "开票数量", displayType: "entry" },
                            { id: "quantity_invoiced", label: "已开票数量" },
                            { id: "quantity_invoicing", label: "未开票数量" },
                            { id: "rate", label: "未税单价" },
                            { id: "amount", label: "未税应收款", type: "currency", displayType: "disabled", summary: true },
                            { id: "taxrate", label: "税率" },
                            { id: "rate_inctax", label: "含税单价" },
                            { id: "amount_inctax", label: "含税应收款", type: "currency", displayType: "disabled", summary: true },
                            { id: "statusref_display_name", label: "状态" },
                            { id: "internalid", label: "出库单ID", displayType: "hidden" },
                            { id: "item", label: "货品ID", displayType: "hidden" },
                            { id: "createdfrom", label: "销售订单ID", displayType: "hidden" },
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
                label: "提交开票",
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
                { id: "subsidiary", label: "子公司", search: { type: "valueText" }, filter: { values: defaultValues.custpage_subsidiary } },
                { id: "mainname", label: "客户", search: { type: "valueText" }, filter: { values: defaultValues.custpage_customer } },
                { id: "currency", label: "货币", search: { type: "valueText" }, filter: { values: defaultValues.custpage_currency } },
                { id: "internalid", alias: "createdfrom", label: "销售订单号ID", filter: { values: defaultValues.custpage_salesorder } },
                { id: "tranid", alias: "createdfrom_display_name", label: "销售订单号" },
                { id: "trandate", label: "出库日期", join: "applyingtransaction", filter: { operator: "within", values: defaultValues.custpage_filter_date } },
                { id: "item", label: "货品", search: { type: "valueText" } },
                { id: "fxrate", alias: "rate", label: "未税单价" },
                { id: "rate", alias: "taxrate", label: "税率", join: "taxitem" },
                { id: "statusref", label: "状态", join: "applyingtransaction", search: { type: "valueText" } },
                { id: "custcol_line_unique_key", alias: "solineid", label: "销售订单货品行唯一键" },
                { id: "applyingtransaction", alias: "internalid", label: "出库单", search: { type: "valueText" } }
            ];
            let resultDataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_sc_gogs_sales_price", searchFields, 1, 1000);
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
            const internalids = [];
            const salesIds = [];
            const itemIds = [];
            resultDataList = resultDataList.map(rdata => {
                if (internalids.indexOf(rdata.internalid) == -1) {
                    internalids.push(rdata.internalid);
                }
                if (salesIds.indexOf(rdata.createdfrom) == -1) {
                    salesIds.push(rdata.createdfrom);
                }
                if (itemIds.indexOf(rdata.item) == -1) {
                    itemIds.push(rdata.item);
                }
                return rdata;
            })
            //查询已开票数量
            const invsearchFields = [
                { id: "isinactive", search: { type: "none" }, filter: { values: "F" } },
                { id: "mainline", join: "custrecord_sc_relation_transaction", filter: { values: "T" } },
                { id: "internalid", join: "custrecord_sc_relation_transaction", filter: { operator: "anyof", values: internalids } },
                { id: "custrecord_sc_relation_item_code", alias: "item", filter: { operator: "anyof", values: itemIds } },
                { id: "custrecord_sc_relation_invoice_qty", alias: "quantity" },
                { id: "custrecord_sc_relation_item_if_line", alias: "solineid", label: "行唯一键" }
            ];
            const invoicedataList = bsworks.search(search).getSearchAllResultDataList("customrecord_sc_tran_relation_invoice", invsearchFields, 1, 1000);

            // const searchFields = [
            //     { id: "internalid", filter: { operator: "anyof", values: salesIds } },
            //     { id: "item", filter: { operator: "anyof", values: itemIds } },
            //     { id: "custcol_line_unique_key", alias: "solineid", label: "销售订单货品行唯一键" },
            // ];
            // const salesdataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_sc_gogs_sales_price", searchFields, 1, 1000);
            // log.debug("salesdataList", salesdataList);

            const newdataList = [];
            resultDataList.forEach(rdata => {
                // const salesdata = salesdataList.find(sdata => rdata.createdfrom == sdata.internalid
                //     && rdata.item == sdata.item && parseInt(rdata.solineid) == parseInt(sdata.solineid));
                // // log.debug("salesdata", salesdata);
                // if (salesdata) {
                //     rdata.rate = salesdata.fxrate;
                //     rdata.taxrate = salesdata.rate;
                //     rdata.solineid = salesdata.solineid;
                // }

                //已开票数量
                rdata.quantity_invoiced = 0;
                const invoiceDataList = invoicedataList.filter(sdata => rdata.internalid == sdata.internalid
                    && rdata.item == sdata.item && rdata.solineid == sdata.solineid);
                if (invoiceDataList.length > 0) {
                    let quantity_invoiced = 0;
                    invoiceDataList.forEach(invdata => {
                        quantity_invoiced = parseFloat(quantity_invoiced) + parseFloat(invdata.quantity || 0);
                    })
                    rdata.quantity_invoiced = parseFloat(quantity_invoiced).toFixed(2);
                }
                //未开票数量
                rdata.quantity_invoicing = (parseFloat(rdata.quantity || 0) - parseFloat(rdata.quantity_invoiced)).toFixed(2);
                rdata.quantity_invoice = rdata.quantity_invoicing;
                rdata.amount = (parseFloat(rdata.quantity_invoice || 0) * parseFloat(rdata.rate || 0)).toFixed(2);
                //计算含税单价 = 未税单价*（1+税率）
                rdata.rate_inctax = (parseFloat(rdata.rate || 0) * (1 + parseInt(rdata.taxrate || 0) / 100)).toFixed(8);
                rdata.amount_inctax = (parseFloat(rdata.quantity_invoice || 0) * parseFloat(rdata.rate_inctax)).toFixed(2);

                if (parseFloat(rdata.quantity_invoicing) > 0) {
                    newdataList.push(rdata);
                }
            })

            return newdataList;
        }



        /**
         * 默认值处理
         * @param {*} defaultValues 
         * @returns 
         */
        const handleDefaultValues = (defaultValues, pageInit) => {
            if (pageInit) {
                defaultValues.custpage_subsidiary = runtime.getCurrentUser().subsidiary;
                const subsidiaryObj = record.load({ type: "subsidiary", id: defaultValues.custpage_subsidiary });
                defaultValues.custpage_currency = subsidiaryObj.getValue("currency");
            }
            customerOptions = platCommon.getSubsidiayCustomer(defaultValues.custpage_subsidiary);
            if (defaultValues.custpage_customer) {
                salesorderOptions = platCommon.getScSalesorderOptions(defaultValues.custpage_customer);
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