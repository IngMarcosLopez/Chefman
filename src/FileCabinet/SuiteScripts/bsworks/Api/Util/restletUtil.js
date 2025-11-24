/**
 * Restlet接口-工具类
 */
define([], () => {

    const constantObj = {
        recordTypeMapping: {
            //物料清单
            "get_itembom": "bom",
            //客户
            "get_customer": "customer",
            //供应商
            "get_supplier": "vendor",
            //仓库
            "get_location": "location",
            //库位
            "get_bin": "bin",
            //科目
            "get_account": "account",
            //库存货品  type=InvtPart
            "get_inventoryitem": "inventoryitem",
            //付款货品
            "Payment": "paymentitem",
            //其他费用货品
            "OthCharge": "otherchargeitem",
            //加价货品
            "Markup": "markupitem",
            //套件货品
            "Kit": "kititem",
            //小计货品
            "Subtotal": "subtotalitem",
            //折扣货品
            "Discount": "discountitem",
            //服务货品
            "Service": "serviceitem",
            //装配件货品  type=Assembly
            "get_assemblyitem": "assemblyitem",
            //说明货品
            "Description": "descriptionitem",
            //货品组
            "Group": "itemgroup",
            //费用货品
            "Expense": "expenseitem",
            //非库存货品
            "NonInvtPart": "noninventoryitem",

        },
        //需要更新同步状态的表
        syncRrecordTypetatus: ["get_inventoryitem", "get_assemblyitem", "get_itembom",
            "get_customer", "get_supplier", "get_location", "get_bin", "get_account"]
    }

    /**
     * 处理请求参数
     * @param {请求参数} requestBody 
     * @returns 
     */
    const HandleRequestBody = (requestBody) => {
        if (null == requestBody || "" == requestBody || undefined == requestBody) {
            requestBody = {};
        }
        if ((parseInt(requestBody.pageIndex) || 0) <= 0) {
            requestBody.pageIndex = 1
        }
        if ((parseInt(requestBody.pageSize) || 0) == 0) {
            requestBody.pageSize = 100
        }
        if (parseInt(requestBody.pageSize) > 100) {
            requestBody.pageSize = 100;
        }
        return requestBody;
    }

    /**
     * 处理回执数据
     * @param {回执数据} dataList 
     * @param {记录类型} recordType 
     * @returns 
     */
    const handleDataList = (dataList, recordType) => {
        dataList = dataList.map(data => {
            if ("base_item_bom" == recordType) {
                data.usecomponentyield = data.usecomponentyield == "T" ? "1" : "0";
                data.availableforalllocations = data.availableforalllocations == "T" ? "1" : "0";
                data.availableforallassemblies = data.availableforallassemblies == "T" ? "1" : "0";
                data.usedonassembly = data.usedonassembly == "T" ? "1" : "0";
            } else if ("base_item_bom_item" == recordType) {
                data.default = data.default == "T" ? "1" : "0";
            } else if ("base_manufacturingrouting" == recordType) {
                data.isdefault = data.isdefault == "T" ? "1" : "0";
            } else if ("base_customer" == recordType) {
                if (data.isperson) {
                    data.isperson = "2";
                    data.isperson_display_name = "个人";
                } else {
                    data.isperson = "1";
                    data.isperson_display_name = "公司";
                }
            } else if ("base_supplier" == recordType) {
                if (data.isperson) {
                    data.isperson = "2";
                    data.isperson_display_name = "个人";
                } else {
                    data.isperson = "1";
                    data.isperson_display_name = "公司";
                }
            } else if ("base_location" == recordType) {
                data.usesbins = data.usesbins == "T" ? "1" : "0";
                data.makeinventoryavailable = data.makeinventoryavailable == "T" ? "1" : "0";
            }

            return data;
        })
        return dataList;
    }

    return {
        constant: constantObj,
        HandleRequestBody,
        handleDataList
    }


});