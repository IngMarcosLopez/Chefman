/**
 * 获取NetSuite数据-基础数据
 */
define(["../../plugin/bsworks/bsworksUtil-1.0.min", "../Util/restletUtil"], (bsworks, restletUtil) => {

    /**
    * 获取货品档案数据
    * @param {*} requestBody 
    */
    const getBaseItem = (requestBody) => {
        // log.debug("requestBody", requestBody);
        const searchFields = [
            { id: "isinactive", label: "非活跃状态", search: { type: "none" }, filter: { values: "F" } },
            { id: "internalid", label: "内部id" },
            { id: "type", label: "类型", search: { type: "none" }, filter: { values: requestBody.type } },
            { id: "itemid", label: "货品编码" },
            { id: "upccode", label: "UPC 代码" },
            { id: "vendorname", label: "供应商名称/代码" },
            { id: "displayname", label: "货品名称" },
            { id: "description", label: "货品说明" },
            { id: "custitem_hc_item_category", alias: "itemcategory", label: "货品分类代码", search: { type: "valueText" }, filter: { operator: "anyof", values: ["1", "2", "3", "4", "5"] } },
            { id: "custitem_hc_item_size", alias: "itemsize", label: "规格型号" },
            { id: "custitem_hc_item_brand", alias: "itembrand", label: "品牌" },
            { id: "custitem_hc_qty_per_box", alias: "qtyperbox", label: "每箱数量" },
            { id: "location", label: "地点代码", search: { type: "valueText" } },
            // { id: "baseunit", label: "主要基本单位代码", search: { type: "valueText" } },
            { id: "unitstype", label: "主要单位类型代码", search: { type: "valueText" } },
            { id: "stockunit", label: "主要库存单位代码", search: { type: "valueText" } },
            { id: "purchaseunit", label: "主要采购单位代码", search: { type: "valueText" } },
            { id: "saleunit", label: "主要销售单位代码", search: { type: "valueText" } },
            { id: "consumptionunit", label: "主要消耗单位代码", search: { type: "valueText" } },
            { id: "purchasedescription", label: "采购说明" },
            { id: "stockdescription", label: "库存说明" },
            { id: "salesdescription", label: "销售说明" },
            { id: "weight", label: "货品重量" },
            { id: "weightunit", label: "货品重量单位代码", search: { type: "valueText" } },
            { id: "created", alias: "createddate", label: "创建时间" },
            { id: "modified", alias: "modifieddate", label: "修改时间" },
            { id: "custitem_bsw_local_sync_status", search: { type: "none" }, label: "本地同步状态", filter: { values: "F" } }

        ];
        let dataList = bsworks.search.getSearchResultDataList("item", searchFields, requestBody.pageIndex, requestBody.pageSize);
        // dataList = restletUtil.handleDataList(dataList, "base_item");
        return dataList;

    }

    /**
     * 获取物料清单数据
     * @param {*} requestBody 
     */
    const getBaseItemBom = (requestBody) => {
        const searchFields = [
            { id: "isinactive", label: "非活跃状态", search: { type: "none" }, filter: { values: "F" } },
            { id: "internalid", label: "内部id" },
            { id: "name", label: "名称" },
            { id: "usecomponentyield", label: "使用组件产出率" },
            { id: "availableforalllocations", label: "可供所有地点使用" },
            { id: "availableforallassemblies", label: "可用于所有装配件", },
            { id: "availableforallassemblies", label: "可用于所有装配件", },
            { id: "usedonassembly", label: "用于装配件", },
            // { id: "restricttolocations", label: "限于地点", },
            // { id: "restricttoassemblies", label: "限于装配件", },
            { id: "custrecord_hc_bom_type", alias: "bomtype", label: "BOM类型", search: { type: "valueText" } },
            { id: "createddate", alias: "createddate", label: "创建时间" },
            //增加下面的字段，会出现大量重复数据
            // { id: "lastmodifieddate", alias: "modifieddate", label: "修改时间", join: "transaction" },
            { id: "custrecord_bsw_local_sync_status", search: { type: "none" }, label: "本地同步状态", filter: { values: "F" } }

        ];
        let dataList = bsworks.search.getSearchResultDataList("bom", searchFields, requestBody.pageIndex, requestBody.pageSize);
        dataList = restletUtil.handleDataList(dataList, "base_item_bom");

        let bomItem = [];
        let bomVersion = [];
        if (dataList.length > 0) {
            const internalids = [];
            dataList.forEach(ditem => {
                internalids.push(ditem.internalid);
            })
            bomVersion = getBaseItemBomrevision(internalids);
            bomItem = getBaseItemBomItem(internalids);
        }
        const bomData = {
            mainData: dataList,
            bomItem: bomItem,
            bomVersion: bomVersion
        };
        return bomData;
    }

    /**
    * 获取物料清单版本数据
    * @param {*} requestBody 
    */
    const getBaseItemBomrevision = (internalids) => {
        const searchFields = [
            { id: "isinactive", label: "非活跃状态", search: { type: "none" }, filter: { values: "F" } },
            { id: "internalid", label: "内部id" },
            { id: "billofmaterials", label: "物料清单内部id", filter: { operator: "anyof", values: internalids } },
            { id: "name", label: "名称" },
            { id: "memo", label: "备注" },
            { id: "createddate", alias: "createddate", label: "创建时间" },
            { id: "effectivestartdate", label: "有效开始日期" },
            { id: "effectiveenddate", label: "有效结束日期" },
            { id: "item", label: "货品", search: { type: "valueText" }, join: 'component' },
            { id: "componentyield", label: "组件产出率", join: 'component' },
            { id: "bomquantity", label: "BOM数量", join: 'component' },
            { id: "quantity", label: "数量", join: 'component' },
            { id: "units", label: "单位", search: { type: "valueText" }, join: 'component' },
        ];
        let dataList = bsworks.search.getSearchAllResultDataList("bomrevision", searchFields, 1, 1000);
        // dataList = restletUtil.handleDataList(dataList, "base_item_bomrevision");
        const newdataList = [];
        if (dataList.length > 0) {
            dataList.forEach(data => {
                let dataObj = newdataList.find(item => item.internalid == data.internalid);
                if (!dataObj) {
                    dataObj = {
                        internalid: data.internalid,
                        billofmaterials: data.billofmaterials,
                        name: data.name,
                        memo: data.memo,
                        createddate: data.createddate,
                        effectivestartdate: data.effectivestartdate,
                        effectiveenddate: data.effectiveenddate
                    };
                    newdataList.push(dataObj);
                }
                if (null == dataObj.component) {
                    dataObj.component = [];
                }
                dataObj.component.push({
                    internalid: data.internalid,
                    item: data.item,
                    item_display_name: data.item_display_name,
                    componentyield: data.componentyield,
                    bomquantity: data.bomquantity,
                    quantity: data.quantity,
                    units: data.units,
                    units_display_name: data.units_display_name
                });
            })
        }
        return newdataList;
    }

    /**
     * 获取物料清单-装配件数据
     * @param {*} requestBody 
     */
    const getBaseItemBomItem = (internalids) => {
        const searchFields = [
            { id: "internalid", alias: "billofmaterials", label: "物料清单内部id", filter: { operator: "anyof", values: internalids } },
            { id: "assemblyid", label: "装配件内部id", join: 'assemblyitem' },
            { id: "default", label: "主默认", join: 'assemblyitem' },
            { id: "locations", label: "对位置默认", join: 'assemblyitem' },
        ];
        let dataList = bsworks.search.getSearchAllResultDataList("bom", searchFields, 1, 1000);
        dataList = restletUtil.handleDataList(dataList, "base_item_bom_item");
        return dataList;
    }


    /**
     * 获取仓库数据
     * @param {*} requestBody 
     */
    const getBaseLocation = (requestBody) => {
        const searchFields = [
            { id: "isinactive", label: "非活跃状态", search: { type: "none" }, filter: { values: "F" } },
            { id: "internalid", label: "内部id" },
            { id: "name", label: "名称" },
            { id: "custrecord_location_abbreviation", alias: "abbr", label: "简称" },
            { id: "usesbins", label: "使用库位" },
            { id: "makeinventoryavailable", label: "使库存可用" },
            { id: "subsidiary", label: "公司", filter: { values: "25" } },
            { id: "locationtype", label: "地点类型", search: { type: "valueText" } },
            { id: "custrecord_hc_location_type", alias: "locationcategory", label: "地点类别", search: { type: "valueText" } },
            { id: "address", label: "地址", join: "address" },
            { id: "custrecord_bsw_location_sync_status", search: { type: "none" }, label: "本地同步状态", filter: { values: "F" } }
        ];
        let dataList = bsworks.search.getSearchResultDataList("location", searchFields, requestBody.pageIndex, requestBody.pageSize);
        dataList = restletUtil.handleDataList(dataList, "base_location");
        return dataList;
    }

    /**
     * 获取客户数据列表
     */
    const getCustomerList = (requestBody) => {
        const searchFields = [
            { id: "isinactive", label: "非活跃状态", search: { type: "none" }, filter: { values: "F" } },
            { id: "internalid", label: "内部id" },
            // { id: "parent", label: "上级" },
            { id: "companyname", label: "公司名称" },
            { id: "entityid", label: "代码" },
            { id: "isperson", label: "类型", },
            { id: "category", label: "类别", search: { type: "valueText" } },
            { id: "entitystatus", label: "状态", search: { type: "valueText" } },
            { id: "subsidiary", label: "主要子公司", search: { type: "valueText" } },
            { id: "internalid", label: "子公司", join: "msesubsidiary", search: { type: "none" }, filter: { values: "25" } },
            { id: "currency", label: "主要币种", search: { type: "valueText" } },
            { id: "terms", label: "账期", search: { type: "valueText" } },
            // { id: "salesrep", label: "销售代表", search: { type: "valueText" } },
            { id: "taxitem", label: "增值税率", search: { type: "valueText" } },
            // { id: "accountnumber", label: "银行账户" },
            // { id: "email", label: "邮箱" },
            // { id: "phone", label: "电话" },
            // { id: "fax", label: "传真" },
            // { id: "address", label: "地址" },
            // { id: "url", label: "网址" },
            { id: "comments", alias: "memo", label: "备注" },
            { id: "datecreated", alias: "createddate", label: "创建时间" },
            { id: "lastmodifieddate", alias: "modifieddate", label: "修改时间" },
            { id: "custentity_bsw_local_sync_status", search: { type: "none" }, label: "本地同步状态", filter: { values: "F" } }
        ];
        let dataList = bsworks.search.getSearchResultDataList("customer", searchFields, requestBody.pageIndex, requestBody.pageSize);
        dataList = restletUtil.handleDataList(dataList, "base_customer");
        return dataList;
    }

    /**
     * 获取供应商数据列表
     */
    const getSupplierList = (requestBody) => {
        const searchFields = [
            { id: "isinactive", label: "非活跃状态", search: { type: "none" }, filter: { values: "F" } },
            { id: "internalid", label: "内部id" },
            { id: "companyname", label: "公司名称" },
            { id: "entityid", label: "代码" },
            { id: "isperson", label: "类型", },
            { id: "category", label: "类别", search: { type: "valueText" } },
            { id: "subsidiary", label: "主要子公司", search: { type: "valueText" } },
            { id: "internalid", label: "子公司", join: "msesubsidiary", search: { type: "none" }, filter: { values: "25" } },
            { id: "custentity_cm_department", alias: "department", label: "部门", search: { type: "valueText" } },
            { id: "currency", label: "主要币种", search: { type: "valueText" } },
            { id: "terms", label: "账期", search: { type: "valueText" } },
            { id: "incoterm", label: "贸易术语", search: { type: "valueText" } },
            // { id: "email", label: "邮箱" },
            // { id: "phone", label: "电话" },
            // { id: "fax", label: "传真" },
            // { id: "address", label: "地址" },
            // { id: "url", label: "网址" },
            { id: "comments", alias: "memo", label: "备注" },
            { id: "datecreated", alias: "createddate", label: "创建时间" },
            { id: "lastmodifieddate", alias: "modifieddate", label: "修改时间" },
            { id: "custentity_bsw_local_sync_status", search: { type: "none" }, label: "本地同步状态", filter: { values: "F" } }
        ];
        // log.debug("requestBody.pageIndex", requestBody.pageIndex)
        let dataList = bsworks.search.getSearchResultDataList("vendor", searchFields, requestBody.pageIndex, requestBody.pageSize);
        dataList = restletUtil.handleDataList(dataList, "base_supplier");
        return dataList;
    }


    /**
     * 获取库位数据
     * @param {*} requestBody 
     */
    const getBaseBin = (requestBody) => {
        const searchFields = [
            { id: "inactive", label: "非活跃状态", search: { type: "none" }, filter: { values: "F" } },
            { id: "internalid", label: "内部id" },
            { id: "binnumber", alias: "name", label: "名称" },
            { id: "location", label: "仓库", search: { type: "valueText" } },
            { id: "memo", label: "备注" },
            { id: "custrecord_bsw_bin_local_sync_status", search: { type: "none" }, label: "本地同步状态", filter: { values: "F" } }
        ];
        let dataList = bsworks.search.getSearchResultDataList("bin", searchFields, requestBody.pageIndex, requestBody.pageSize);
        // dataList = restletUtil.handleDataList(dataList, "base_bin");
        return dataList;
    }

    const getAccountList = (requestBody) => {
        //只查询以下科目
        //1546	131103	Repair Expense (修理费)
        //465	640004	产品开发
        //466	640005	产品测试
        //232	130008	待处理财产损溢
        const searchFields = [
            { id: "isinactive", label: "活动状态", search: { type: "none" }, filter: { value: "F" } },
            // { id: "internalid", label: "内部id", search: { sort: "ASC" } },
            { id: "internalid", label: "内部id", search: { sort: "ASC" }, filter: { operator: "anyof", values: ['232', '465', '466', '1546'] } },
            { id: "name", label: "名称" },
            { id: "number", label: "编号" },
            { id: "type", label: "类型", search: { type: "valueText" } },
            { id: "description", label: "说明" },
            { id: "custrecord_bsw_account_local_sync_status", search: { type: "none" }, label: "本地同步状态", filter: { values: "F" } }

        ];
        // log.debug("getAccountList", requestBody)
        let dataList = bsworks.search.getSearchResultDataList("account", searchFields, requestBody.pageIndex, requestBody.pageSize);
        return dataList;
    }

    /**
    * 获取自定义列表数据
    */
    const getCustlistList = (requestBody) => {
        const searchFields = [
            { id: "isinactive", label: "活动状态", search: { type: "none" }, filter: { value: "F" } },
            { id: "internalid", label: "内部id", search: { sort: "ASC" } },
            { id: "name", label: "名称" },
            // { id: "scriptid", alias: "guid", label: "guid" },
        ];

        let dataList = bsworks.search.getSearchResultDataList(requestBody.listType, searchFields, requestBody.pageIndex, requestBody.pageSize);
        return dataList;
    }

    return {
        getBaseItem,
        getBaseItemBom,
        getCustomerList,
        getSupplierList,
        getBaseLocation,
        getBaseBin,
        getAccountList,
        getCustlistList
    }
});