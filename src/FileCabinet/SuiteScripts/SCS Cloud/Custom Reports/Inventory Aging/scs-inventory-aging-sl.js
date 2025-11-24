/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NScriptType Suitelet
 * @see https://system.netsuite.com/app/help/helpcenter.nl?fid=section_4387799600.html
 * @author Zach Rumancik <zach.rumancik@scscloud.com>
 */
define(['N/query', 'N/ui/serverWidget', 'N/record', '../suitelet-lib', 'N/format'],
  
  /**
   * @param {query} query
   * @param {serverWidget} serverWidget
   * @param {record} record
   * @param lib
   * @param {format} format
   * @return {{
   *   onRequest: Function,
   * }}
   */
  (query, serverWidget, record, lib, format) => {
    
    /** @type {string} */
    let sqlDateFormat;
    /** @type {Object<(record.Type|string), string>} */
    let TransactionLabel;
    const dateIntervals = [
      {from: 121},
      {from: 91, to: 120},
      {from: 61, to: 90},
      {from: 31, to: 60},
      {from: 1, to: 30},
    ];
    
    /**
     * @param {Object} options
     * @param {typeof FilterField} options.FilterField
     * @param {typeof ColumnField} options.ColumnField
     * @return {Object<string, string|number>[]} - {fieldId1:value, fieldId2:value}[]
     */
    const getResults = ({FilterField, ColumnField}) => {
      /** @type {string[]} */
      const filterLocation = FilterField.location.value;
      /** @type {string[]} */
      const filterSubsidiary = FilterField.subsidiary.value;
      /** @type {string[]} */
      const filterItem = FilterField.item.value;
      /** @type {string} */
      const filterDate = FilterField.date.value;
      
      /** @type {boolean} */
      const filterIncludeInventoryValue = FilterField.includeInventoryValue.value === 'T';
      /** @type {boolean} */
      const filterMakeQuantityPercent = FilterField.makeQuantityPercent.value === 'T';
      
      if (!filterIncludeInventoryValue) {
        dateIntervals.forEach((_, index) =>
          ColumnField['amountBucket' + index].displayType = serverWidget.FieldDisplayType.HIDDEN,
        );
        ColumnField.avgCost.displayType = serverWidget.FieldDisplayType.HIDDEN;
        ColumnField.totAmount.displayType = serverWidget.FieldDisplayType.HIDDEN;
      }
      
      if (filterIncludeInventoryValue) {
        dateIntervals.forEach((_, index) =>
          ColumnField['amountBucket' + index].csv = true,
        );
        ColumnField.totAmount.csv = true;
        ColumnField.avgCost.csv = true;
      }
      
      
      if (filterMakeQuantityPercent) {
        dateIntervals.forEach((_, index) =>
          ColumnField['quantityBucket' + index].total = false,
        );
      }
      
      sqlDateFormat = lib.getSqlDateFormat();
      log.debug('Filters:', {filterLocation, filterSubsidiary, filterItem, filterIncludeInventoryValue, filterMakeQuantityPercent});
      
      const quantityColumns = dateIntervals.map(({from, to}, index) =>
        `
          SUM(
            CASE WHEN
              ${suiteQlDaysBetween('t.trandate', 0, filterDate)} ${to ? '>=' : '>'} ${from}
                ${to ? ` AND
              ${suiteQlDaysBetween('t.trandate', 0, filterDate)} <= ${to} ` : ''}
              AND tl.quantity >= 0
            THEN tl.quantity ELSE 0 END
          ) quantity_bucket_${index},
          SUM(
            CASE WHEN
              ${suiteQlDaysBetween('t.trandate', 0, filterDate)} ${to ? '>=' : '>'} ${from}
                ${to ? ` AND
              ${suiteQlDaysBetween('t.trandate', 0, filterDate)} <= ${to} ` : ''}
              AND tl.quantity < 0
            THEN tl.quantity ELSE 0 END
          ) quantity_bucket_${index}_neg,
        `,
      ).join('');
      const amountColumns = dateIntervals.map(({from, to}, index) =>
        `
          SUM(
            CASE WHEN
              ${suiteQlDaysBetween('t.trandate', 0, filterDate)} ${to ? '>=' : '>'} ${from}
                ${to ? ` AND
              ${suiteQlDaysBetween('t.trandate', 0, filterDate)} <= ${to} ` : ''}
              AND tal.netamount >= 0
            THEN tal.netamount ELSE 0 END
          ) amount_bucket_${index},
          SUM(
            CASE WHEN
              ${suiteQlDaysBetween('t.trandate', 0, filterDate)} ${to ? '>=' : '>'} ${from}
                ${to ? ` AND
              ${suiteQlDaysBetween('t.trandate', 0, filterDate)} <= ${to} ` : ''}
              AND tal.netamount < 0
            THEN tal.netamount ELSE 0 END
          ) amount_bucket_${index}_neg,
        `,
      ).join('');
      /** @type {string} */
      const suiteQL = `
        WITH item_on_hand AS (
          SELECT
            SUM(ail.quantityonhand) quantityonhand,
            ail.item
          FROM aggregateitemlocation ail
          JOIN LocationSubsidiaryMap lsm ON lsm.location = ail.location
            ${filterLocation?.length ? ` AND lsm.location IN (${filterLocation}) ` : ''}
            ${filterSubsidiary?.length ? ` AND lsm.subsidiary IN (${filterSubsidiary.map(s => `'${s}'`)}) ` : ''}
          GROUP BY item
        )
        SELECT
        
          i.id item_id,
          MAX(i.displayname) name,
          MAX(i.itemid) itemid,
          MAX(i.description) description,
          MAX(i.averagecost) averagecost,
          MAX(BUILTIN.DF(tl.location)) location_display,
          
          ${quantityColumns}
          
          ${amountColumns}
          
          SUM(tl.quantity) quantity_total,
          SUM(tal.netamount) amount_total,
          MAX(item_on_hand.quantityonhand) quantityonhand
          
        FROM transaction t
        JOIN transactionLine tl ON tl.transaction = t.id
          ${filterSubsidiary?.length ? ` AND tl.subsidiary IN (${filterSubsidiary}) ` : ''}
          ${filterLocation.length ? ` AND tl.location IN (${filterLocation}) ` : ''}
          ${filterItem.length ? ` AND tl.item IN (${filterItem}) ` : ''}
        JOIN transactionaccountingline tal ON tal.transaction = tl.transaction
          AND tal.transactionline = tl.id
          AND tal.posting = 'T'
        JOIN item i ON i.id = tl.item
          AND i.assetaccount = tl.expenseaccount
          AND i.itemtype IN ('InvtPart', 'Assembly', 'Kit')
        JOIN item_on_hand ON item_on_hand.item = tl.item
        WHERE t.trandate <= TO_DATE('${filterDate}', '${sqlDateFormat}')
        GROUP BY i.id
        ORDER BY MAX(i.itemid) DESC
      `;
      
      /** @type {({
       *   item_id: number,
       *   itemid: string,
       *   name: string,
       *   description: string,
       *   location: number,
       *   location_display: string,
       *   recordtype: string,
       *   quantityonhand: number,
       *   averagecost: number,
       *   quantity_total: number,
       *   amount_total: number,
       * }|Object)[]}
       */
      const results = lib.processSuiteQL(suiteQL);
      // log.debug('Results:', results);
      
      return results.map(result => {
        const quantityBucketArray = dateIntervals.map((_, index) => result[`quantity_bucket_${index}`]);
        const quantityBucketArrayNeg = dateIntervals.map((_, index) => result[`quantity_bucket_${index}_neg`]);
        const amountBucketArray = dateIntervals.map((_, index) => result[`amount_bucket_${index}`]);
        const amountBucketArrayNeg = dateIntervals.map((_, index) => result[`amount_bucket_${index}_neg`]);
        
        const negativeQuantitySum = quantityBucketArrayNeg.reduce((acc, columnValue) => acc + (columnValue ?? 0), 0);
        const negativeAmountSum = amountBucketArrayNeg.reduce((acc, columnValue) => acc + (columnValue ?? 0), 0);
        
        // log.debug('Buckets:', {
        //   quantityBucketArray,
        //   quantityBucketArrayNeg,
        //   amountBucketArray,
        //   amountBucketArrayNeg,
        //   negativeAmountSum,
        //   negativeQuantitySum,
        // });
        
        const numberOfBuckets = dateIntervals.length;
        const lastBucketIndex = numberOfBuckets - 1;
        const getFinalColumnValue = (bucketNumber, negativeSum, bucketArray) => {
          let finalSum = negativeSum;
          let bucketIndex = 0;
          for (let buckets = numberOfBuckets - bucketNumber; buckets > 0; buckets--) {
            finalSum += bucketArray[bucketIndex];
            bucketIndex += 1;
          }
          return finalSum > 0 ? finalSum : 0;
        };
        
        const finalMonthAmountArray = [];
        for (let columns = 0; columns < numberOfBuckets; columns++) {
          finalMonthAmountArray[columns] = getFinalColumnValue(lastBucketIndex - columns, negativeAmountSum, amountBucketArray);
        }
        const finalMonthQuantityArray = [];
        for (let columns = 0; columns < numberOfBuckets; columns++) {
          finalMonthQuantityArray[columns] = getFinalColumnValue(lastBucketIndex - columns, negativeQuantitySum, quantityBucketArray);
        }
        
        return lib.processResult([
          [ColumnField.item, {
            text: result.itemid,
            value: result.item_id,
          }],
          [ColumnField.onHand, {
            value: result.quantityonhand,
          }],
          ...(dateIntervals.reduce((acc, _, index) => {
            const amountColumn = ColumnField['amountBucket' + index] ?? {};
            const quantityColumn = ColumnField['quantityBucket' + index];
            const amountValue = index ? finalMonthAmountArray[index] - finalMonthAmountArray[index - 1] : finalMonthAmountArray[index];
            const quantityValue = index ? finalMonthQuantityArray[index] - finalMonthQuantityArray[index - 1] : finalMonthQuantityArray[index];
            
            return acc.concat(
              [[
                quantityColumn, {
                  value: filterMakeQuantityPercent ?
                    convertToPercent(result.quantityonhand, quantityValue)
                    :
                    formatNumberFloat(quantityValue),
                },
              ]],
              [[
                amountColumn,
                {value: formatNumber(amountValue)},
              ]],
            );
          }, [])),
          [ColumnField.productName, {
            value: result.name,
          }],
          [ColumnField.avgCost, {
            value: formatNumber(result.averagecost),
          }],
          [ColumnField.totAmount, {
            value: formatNumber(result.amount_total),
          }],
        ]);
      });
    };
    
    /**
     * @param {OnRequestContext} context
     * @return {void}
     */
    const onRequest = context => {
      try {
        log.audit('onRequest', {
          request: {
            clientIpAddress: context.request.clientIpAddress,
            url: context.request.url,
            method: context.request.method,
            parameters: context.request.parameters,
          },
        });
        const {request, response} = context;
        
        /** @type {typeof FilterField} */
        const FilterField = getFilterFieldEnum();
        
        /** @type {typeof ColumnField} */
        const ColumnField = getColumnFieldEnum();
        
        
        dateIntervals.forEach(({from, to}, index) => {
          ColumnField[`quantityBucket${index}`] = {
            id: `quantity_bucket_${index}`,
            label: to ? `${from} - ${to} Days (Qty.)` : `More than ${from} Days (Qty.)`,
            type: serverWidget.FieldType.TEXT,
            total: true,
            numberFormat: true,
          };
          ColumnField[`amountBucket${index}`] = {
            id: `amount_bucket_${index}`,
            label: to ? `${from} - ${to} Days (Amt.)` : `More than ${from} Days (Amt.)`,
            type: serverWidget.FieldType.TEXT,
            total: true,
            csv: false,
            numberFormat: true,
          };
        });
        
        
        lib.createSuitelet({
          context,
          FilterField,
          ColumnField,
          getResults,
          title: 'Inventory Aging',
          clientScriptModulePath: './Inventory Aging/scs-inventory-aging-cs',
          filterFields: [
            FilterField.item,
            FilterField.subsidiary,
            FilterField.location,
            FilterField.date,
            FilterField.includeInventoryValue,
            FilterField.makeQuantityPercent,
          ],
          columnFields: [
            ColumnField.item,
            ColumnField.productName,
            ColumnField.onHand,
            ColumnField.totAmount,
            ...(dateIntervals.reduce((acc, _, index) =>
                acc.concat(ColumnField['amountBucket' + index], ColumnField['quantityBucket' + index])
              , []).reverse()),
            ColumnField.avgCost,
          ],
        });
      } catch (e) {
        log.error('onRequest', e.toJSON ? e : (e.stack ? e.stack : e.toString()));
      }
    };
    
    /**
     * @return {typeof FilterField}
     */
    const getFilterFieldEnum = () => {
      
      /**
       * @typedef {Object} FilterFieldInterface
       * @property {string} key
       * @property {string} id
       * @property {string} label
       * @property {string} [help]
       * @property {serverWidget.FieldType} type
       * @property {record.Type|string} source
       * @property {SelectOption[]} [options]
       * @property {serverWidget.FieldDisplayType} displayType
       * @property {serverWidget.FieldLayoutType} layoutType
       * @property {serverWidget.FieldBreakType} breakType
       * @property {boolean} [mandatory = false]
       * @property {string|string[]|number|boolean|Date} [defaultValue]
       * @property {string|string[]|number|boolean|Date} [value]
       * @property {boolean} [csv = true]
       */
      
      /** @enum {FilterFieldInterface} */
      const FilterField = {
        item: {
          id: 'item',
          label: 'Item',
          type: serverWidget.FieldType.MULTISELECT,
          options: lib.processSuiteQL(`
            SELECT
              (i.itemid || ' ' || i.displayname) text,
              i.id value
            FROM item i
            WHERE i.itemtype IN ('InvtPart', 'Assembly', 'Kit')
            AND i.id NOT IN (
              SELECT
                sub_i.parent
              FROM item sub_i
              WHERE sub_i.parent = i.id
                AND rownum = 1
            )
          `),
          emptyDefault: false,
          breakType: serverWidget.FieldBreakType.STARTCOL,
          help: 'This field allows the report to be filtered on a per item bases. Enter in an itemid or use the double arrows next to the field to find any items you wish to add.',
          width: 400,
          height: 17,
        },
        location: {
          id: 'location',
          label: 'Location',
          type: serverWidget.FieldType.MULTISELECT,
          source: 'location',
          textQuery: `
            SELECT
              name
            FROM location
            WHERE id IN (@@values@@)
          `,
          emptyDefault: false,
          breakType: serverWidget.FieldBreakType.STARTCOL,
          help: 'Any selected locations will filter the results to only consider transactions from those locations. To select multiple, you can click drag your mouse or click while holding shift. Alternatively, you can use CTRL + click to select/deselect multiple lines.',
        },
        subsidiary: {
          id: 'subsidiary',
          label: 'Subsidiay',
          type: serverWidget.FieldType.MULTISELECT,
          source: 'subsidiary',
          textQuery: `
            SELECT
              name
            FROM subsidiary
            WHERE id IN (@@values@@)
          `,
          emptyDefault: false,
          breakType: serverWidget.FieldBreakType.STARTCOL,
          help: 'Any selected locations will filter the results to only consider transactions from those locations. To select multiple, you can click drag your mouse or click while holding shift. Alternatively, you can use CTRL + click to select/deselect multiple lines.',
          width: 600,
          height: 17,
        },
        date: {
          id: 'date',
          label: 'Date',
          type: serverWidget.FieldType.DATE,
          defaultValue: formatDate(new Date()),
          breakType: serverWidget.FieldBreakType.STARTROW,
          help: 'This field allows you to select a date to filter the results by. The results will only include transactions that occurred on or before the selected date.',
        },
        includeInventoryValue: {
          id: 'include_inventory_value',
          label: 'Include Inventory Value',
          type: serverWidget.FieldType.CHECKBOX,
          breakType: serverWidget.FieldBreakType.STARTROW,
          help: 'Checking this field will add an amount column for each time bucket.',
        },
        makeQuantityPercent: {
          id: 'quantity_percent',
          label: 'Make Quantity A Percent',
          type: serverWidget.FieldType.CHECKBOX,
          help: 'Checking this field will convert the quantity columns into a percentage of the total on-hand.',
        },
      };
      
      Object.entries(FilterField).forEach(([key, filterField]) => filterField.key = key);
      
      return FilterField;
    };
    
    /**
     * @return {typeof ColumnField}
     */
    const getColumnFieldEnum = () => {
      
      /**
       * @typedef {Object} ColumnFieldInterface
       * @property {string} id
       * @property {string} label
       * @property {serverWidget.FieldType} type
       * @property {string} [recordType]
       * @property {boolean} [formatting = false]
       */
      
      /** @enum {ColumnFieldInterface} */
      const ColumnField = {
        type: {
          id: 'custpage_column_type',
          label: 'Type',
          type: serverWidget.FieldType.TEXT,
        },
        item: {
          id: 'custpage_item',
          label: 'Item',
          type: serverWidget.FieldType.TEXT,
          recordType: 'item',
        },
        onHand: {
          id: 'custpage_on_hand',
          label: 'On Hand',
          type: serverWidget.FieldType.TEXT,
          total: true,
          numberFormat: true,
        },
        avgCost: {
          id: 'custpage_avg_cost',
          label: 'Average Cost',
          type: serverWidget.FieldType.TEXT,
          csv: false,
        },
        totAmount: {
          id: 'custpage_tot_amout',
          label: 'Total Amount',
          type: serverWidget.FieldType.TEXT,
          csv: false,
          total: true,
          numberFormat: true,
        },
        more120Amt: {
          id: 'custpage_more120_amt',
          label: 'More than 120 (Amt.)',
          type: serverWidget.FieldType.TEXT,
        },
        productName: {
          id: 'custpage_product_name',
          label: 'Product Name',
          type: serverWidget.FieldType.TEXT,
        },
      };
      return ColumnField;
    };
    
    const fieldSorter = (fields) => (a, b) => fields.map(o => {
      let dir = 1;
      if (o[0] === '-') {
        dir = -1;
        o = o.substring(1);
      }
      if (!a[o]) return 1;
      return a[o] > b[o] ? dir : a[o] < b[o] ? -(dir) : 0;
    }).reduce((p, n) => p ? p : n, 0);
    
    /**
     * @param {number} num
     * @param {number} decimalPlaces
     * @return {number}
     */
    const convertFromDecimal = (num, decimalPlaces) => Math.floor(Math.pow(10, decimalPlaces) * num);
    /**
     * @param {number | string} num
     * @return {string}
     */
    const formatNumber = num => num ? format.format({
      value: num,
      type: format.Type.CURRENCY,
    }) : num;
    /**
     * @param {number | string} num
     * @return {string}
     */
    const formatNumberFloat = num => num ? format.format({
      value: num,
      type: format.Type.FLOAT,
    }) : num;
    /**
     * @param  {number} num
     * @param  {number} match
     * @return {[number, number]}
     */
    const matchSign = (num, match = 0) => num === 0 || match === 0 ? [num, match] : num < 0 ? [num, -1 * Math.abs(match)] : [num, Math.abs(match)];
    
    /**
     * @param {string} dateColumn
     * @param {number} [daysOffset = 0]
     * @param {string} [compareAgainst = sysdate]
     * @return {string}
     */
    const suiteQlDaysBetween = (dateColumn, daysOffset = 0, compareAgainst = 'sysdate') =>
      `FLOOR(${compareAgainst === 'sysdate' ? 'sysdate' : `TO_DATE('${compareAgainst}', '${sqlDateFormat}')`} + ${daysOffset} - ${dateColumn})`;
    
    const getTransactionLabels = () => {
      const TransactionLabel = {
        [record.Type.VENDOR_BILL]: 'Bill',
        [record.Type.VENDOR_CREDIT]: 'Bill Credit',
        [record.Type.VENDOR_PAYMENT]: 'Bill Payment',
        [record.Type.CASH_REFUND]: 'Cash Refund',
        [record.Type.CASH_SALE]: 'Cash Sale',
        [record.Type.CHECK]: 'Check',
        [record.Type.CREDIT_MEMO]: 'Credit Memo',
        [record.Type.CUSTOMER_DEPOSIT]: 'Customer Deposit',
        [record.Type.CUSTOMER_REFUND]: 'Customer Refund',
        [record.Type.DEPOSIT]: 'Deposit',
        [record.Type.DEPOSIT_APPLICATION]: 'Deposit Application',
        [record.Type.ESTIMATE]: 'Estimate',
        [record.Type.EXPENSE_REPORT]: 'Expense Report',
        [record.Type.CHARGE]: 'Finance Charge',
        [record.Type.INBOUND_SHIPMENT]: 'Inbound Shipment',
        [record.Type.INVENTORY_ADJUSTMENT]: 'Inventory Adjustment',
        [record.Type.INVENTORY_COUNT]: 'Inventory Count',
        [record.Type.INVENTORY_TRANSFER]: 'Inventory Transfer',
        [record.Type.BIN_WORKSHEET]: 'Inventory Worksheet',
        [record.Type.INVOICE]: 'Invoice',
        [record.Type.ITEM_FULFILLMENT]: 'Item Fulfillment',
        [record.Type.ITEM_RECEIPT]: 'Item Receipt',
        [record.Type.JOURNAL_ENTRY]: 'Journal',
        [record.Type.OPPORTUNITY]: 'Opportunity',
        [record.Type.ORDER_RESERVATION]: 'Order Reservation',
        [record.Type.BULK_OWNERSHIP_TRANSFER]: 'Ownership Transfer',
        [record.Type.CUSTOMER_PAYMENT]: 'Payment',
        [record.Type.PURCHASE_ORDER]: 'Purchase Order',
        [record.Type.RETURN_AUTHORIZATION]: 'Return Authorization',
        [record.Type.SALES_ORDER]: 'Sales Order',
        [record.Type.TRANSFER_ORDER]: 'Transfer Order',
        [record.Type.VENDOR_PREPAYMENT]: 'Vendor Prepayment',
        [record.Type.VENDOR_PREPAYMENT_APPLICATION]: 'Vendor Prepayment Application',
        [record.Type.VENDOR_RETURN_AUTHORIZATION]: 'Vendor Return Authorization',
      };
      return TransactionLabel;
    };
    const convertToPercent = (total, val) => `${format.format({
      value: parseFloat((val === 0 ? 0 : (val / total) * 100).toFixed(2)),
      type: format.Type.FLOAT,
    })}%`;
    
    /**
     * @param {Date} date
     * @return {string}
     */
    const formatDate = date => `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
    
    
    return {onRequest};
  },
);
