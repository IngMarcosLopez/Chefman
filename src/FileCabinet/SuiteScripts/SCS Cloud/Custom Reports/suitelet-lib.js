/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @see [File Templates]{@link https://github.com/burkybang/SuiteScript-WebStorm-File-Templates}
 * @see [Type Declarations]{@link https://github.com/burkybang/SuiteScript-2.0-Type-Declarations}
 * @author Adam Smith <adam.smith@scscloud.com>, Zach Rumancik <zach.rumancik@scscloud.com>
 */
define(['N/query', 'N/ui/serverWidget', 'N/file', 'N/record', 'N/format', 'N/runtime', 'N/url', 'N/encode'],
  
  /**
   * @param {query} query
   * @param {serverWidget} serverWidget
   * @param {file} file
   * @param {record} record
   * @param {format} format
   * @param {runtime} runtime
   * @param {url} url
   * @param {encode} encode
   */
  (query, serverWidget, file, record, format, runtime, url, encode) => {
    
    /** @type {string} */
    const sublistLabel = 'Results';
    
    /** @type {string} */
    const sublistId = sublistLabel.toLowerCase();
    
    /** @type {number} */
    const floatHelper = 100;
    
    /**
     * @param {number[]} nums
     * @return {number}
     */
    const getSum = nums => nums.reduce((sum, num) => sum + (num * floatHelper), 0) / floatHelper;
    
    /**
     * @typedef {Object} SelectOption
     * @property {string} text
     * @property {number|string} value
     */
    
    const resolveRecordUrlOverrides = {
      transaction: '/app/accounting/transactions/transaction.nl?id=',
      entity: '/app/common/entity/entity.nl?id=',
      item: '/app/common/item/item.nl?id=',
    };
    
    /**
     * @param {record.Type|string} recordType
     * @param {number|string} recordId
     * @return {string}
     */
    const resolveRecordUrl = ({recordType, recordId}) =>
      resolveRecordUrlOverrides[recordType] ?
        resolveRecordUrlOverrides[recordType] + recordId
        :
        url.resolveRecord({recordType, recordId}).replace(/&compid=.*$/, '');
    
    /**
     * @param {Object} options
     * @param {OnRequestContext} options.context
     * @param {typeof FilterField} options.FilterField
     * @param {typeof ColumnField} options.ColumnField
     * @param {typeof AdditionalField} options.AdditionalField
     * @param {string} options.title
     * @param {serverWidget.SublistType} [sublistType = serverWidget.SublistType.LIST]
     * @param {FilterFieldInterface[]} options.filterFields
     * @param {ColumnFieldInterface[]} options.columnFields
     * @param {AdditionalFieldInterface[]} options.additionalFields
     * @param {(options:{FilterField:typeof FilterField, ColumnField:typeof ColumnField}) => Object<string, string|number>[]} options.getResults
     * @param {string} clientScriptModulePath
     * @return {void}
     */
    const createSuitelet = (
      {
        context,
        FilterField,
        ColumnField,
        AdditionalField,
        getResults,
        title,
        sublistType = serverWidget.SublistType.LIST,
        filterFields,
        columnFields,
        totalsConfig = {},
        conditionalColumns,
        additionalFields,
        clientScriptModulePath,
      },
    ) => {
      log.audit('onRequest', {
        request: {
          clientIpAddress: context.request.clientIpAddress,
          url: context.request.url,
          method: context.request.method,
          parameters: context.request.parameters,
        },
      });
      
      const {request: {parameters}, response} = context;
      const firstTimeLoading = Object.keys(parameters).length === 2;
      getFilters({FilterField, parameters, filterFields});
      const postProcessingParameters = Object.entries(parameters).reduce((acc, [key, value]) => {
        acc[key] = value;
        Object.values(FilterField).forEach(({id, type}) => {
          if (type === serverWidget.FieldType.MULTISELECT && id === key) {
            acc[key] = (typeof value) === 'string' ? (value ?? '')?.split(/[,\u0005]+/g) : value;
          }
        });
        return acc;
      }, {});
      
      /** @type {Object<string, string|number>[]} */
      const results = firstTimeLoading ? [] : getResults({FilterField, ColumnField, AdditionalField});
      /**
       * @typedef {Object} TotalsObj
       * @property {number} index
       * @property {string} id
       * @property {number} value
       * @property {string} text
       */
      
      /** @type {Object<string, TotalsObj>} */
      const mainTotals = !results.length ? {} : columnFields.reduce((
        obj,
        {total, type, id, numberFormat},
        index,
      ) => {
        if (total) {
          /** @type {number} */
          const value = getSum(results.map(result =>
              +(result[id] + '')?.replace(/[(),$%]+/, '') || 0,
            ),
          );
          obj[id] = {
            index, id, value,
            text: format.format({
              type: numberFormat ? format.Type.FLOAT : type.toLowerCase(),
              value,
            }),
          };
        }
        return obj;
      }, /** @type {Object<string, TotalsObj>} */ {});
      
      /**
       * @typedef {Object} TotalCalculation
       * @property {ColumnField} underColumn
       * @property {(reportTitle:string) => string} getLabel
       * @property {(totals: Object<number, TotalsObj>) => number} calculate
       */
      
      /** @type {number} */
      const totalsLabelColumnIndex = !results.length || !totalsConfig.labelColumn ? 0 :
        Math.max(columnFields.findIndex(({id}) => id === totalsConfig.labelColumn.id), 0);
      
      /** @type {{index:number, label:string, value:number|string, text:string}[]} */
      const additionalTotalRows = !results.length || !totalsConfig.additionalRows ? [] :
        Object.entries(totalsConfig.additionalRows).map((
          [label, {underColumn, getLabel, calculate}],
        ) => {
          /** @type {number} */
          const value = (() => {
            try {
              return calculate(mainTotals) || 0;
            } catch (e) {
              log.error(`calculate "${label}"`, e.toJSON ? e : (e.stack ? e.stack : e.toString()));
            }
            return 0;
          })();
          return {
            label: getLabel(originalTitle),
            index: Math.max(columnFields.findIndex(({id}) => id === underColumn.id), 0),
            value,
            text: format.format({
              type: underColumn.type.toLowerCase(),
              value: (() => {
                switch (underColumn.type) {
                  case serverWidget.FieldType.FLOAT:
                  case serverWidget.FieldType.INTEGER:
                  case serverWidget.FieldType.CURRENCY:
                  case serverWidget.FieldType.PERCENT:
                    return value.toFixed?.(2) ?? value;
                }
                return value;
              })(),
            }),
          };
        });
      
      if (postProcessingParameters.csv === 'T') {
        response.writeFile({
          file: createCsvFile({
            title, filterFields, columnFields, results, totals: {
              main: mainTotals,
              labelColumnIndex: totalsLabelColumnIndex,
              additionalRows: additionalTotalRows,
            },
          }),
        });
      }
      else if (postProcessingParameters.xls === 'T') {
        response.writeFile({
          file: createXlsFile({
            title, filterFields, columnFields, results, totals: {
              main: mainTotals,
              labelColumnIndex: totalsLabelColumnIndex,
              additionalRows: additionalTotalRows,
            },
          }),
        });
      }
      else {
        const {form, sublist} = createForm({title, filterFields, columnFields, additionalFields, clientScriptModulePath, sublistType});
        
        form.updateDefaultValues(postProcessingParameters);
        
        fillSublist({sublist, columnFields, results});
        
        /** @type {runtime.Script} */
        const script = runtime.getCurrentScript();
        
        /** @type {Object<string, string>} */
        const urlParams = {
          script: script.id,
          deploy: script.deploymentId,
        };
        
        filterFields?.forEach(({id, value}) => {
          if (value)
            urlParams[id] = value;
        });
        
        const mainTotalsArr = Object.values(mainTotals);
        
        additionalFields?.forEach(({id, value}) => {
          if (value)
            form.getField({id}).defaultValue = value;
        });
        
        form.addField({
          type: serverWidget.FieldType.INLINEHTML,
          label: 'HTML',
          id: 'html',
        }).defaultValue = // language=HTML
          `
            <style>
              .uir-listheader-button-table,
              .uir-machine-button-row,
              .uir-machine-row.listtextnonedit {
                display: none !important;
              }
            </style>
            <script>
              /** @type {Object<string, string>} */
              const params = ${JSON.stringify(urlParams)};
              /** @type {URL} */
              const url = new URL(location.pathname, location.origin);
              Object.entries(params).forEach(([param, value]) => url.searchParams.set(param, value));
              history.replaceState(null, null, url.href);
              if (${results.length && mainTotalsArr.length})
                document.addEventListener('DOMContentLoaded', () => {
                  /** @type {HTMLTableElement} */
                  const tableEl = document.querySelector('#${sublistId}_splits');
                  if (tableEl) {
                    
                    /** @type {HTMLTableRowElement} */
                    const firstRowEl = tableEl.querySelector('#${sublistId}row0');
                    if (firstRowEl) {
                      /** @type {HTMLTableRowElement} */
                      const templateRowEl = firstRowEl.cloneNode(true);
                      templateRowEl.id = templateRowEl.id.replace('row', 'totalsrow');
                      templateRowEl.classList.remove('uir-list-row-odd');
                      
                      /** @type {number} */
                      const totalsLabelColumnIndex = ${totalsLabelColumnIndex};
                      
                      templateRowEl.classList.replace('uir-list-row-tr', 'uir-machine-totals-row');
                      // templateRowEl.classList.add('uir-machine-totals-row');
                      
                      [...templateRowEl.children].forEach((cellEl, index) => {
                        cellEl.innerText = '';
                        cellEl.classList.remove('uir-list-row-cell');
                        if (index === totalsLabelColumnIndex)
                          cellEl.classList.replace('listtextrt', 'listtext');
                      });
                      
                      /** @type {HTMLTableSectionElement} */
                      const tfootEl = document.createElement('tfoot');
                      
                      /** @type {HTMLTableRowElement} */
                      const mainTotalsRowEl = templateRowEl.cloneNode(true);
                      
                      /** @type {HTMLCollection} */
                      const mainTotalsRowCellEls = mainTotalsRowEl.children;
                      mainTotalsRowCellEls[totalsLabelColumnIndex].innerText = 'Totals';
                      
                      /** @type {TotalsObj[]} */
                      const mainTotalsArr = ${JSON.stringify(mainTotalsArr)};
                      mainTotalsArr.forEach(({index, text}) => mainTotalsRowCellEls[index].innerText = text);
                      
                      tfootEl.append(mainTotalsRowEl);
                      
                      /** @type {{index:number, label:string, value:number|string, text:string}[]} */
                      const additionalTotalRows = ${JSON.stringify(additionalTotalRows)};
                      
                      additionalTotalRows.forEach(({label, index, text}) => {
                        /** @type {HTMLTableRowElement} */
                        const totalRowEl = templateRowEl.cloneNode(true);
                        
                        /** @type {HTMLCollection} */
                        const cellEls = totalRowEl.children;
                        cellEls[totalsLabelColumnIndex].innerText = label;
                        cellEls[index].innerText = text;
                        
                        tfootEl.append(totalRowEl);
                      });
                      
                      tableEl.append(tfootEl);
                    }
                  }
                });
              window.ColumnField = ${JSON.stringify(ColumnField)};
              window.FilterField = ${JSON.stringify(FilterField)};
              window.AdditionalField = ${JSON.stringify(AdditionalField)};
            </script>
            <style>
              .uir-machine-totals-row > td {
                font-weight: bold;
              }
              
              html.isDarkMode .uir-machine-totals-row > td {
                border-top: 0 !important;
                border-bottom-color: var(--dark-3, #3e3f42) !important;
              }
              
              html.isDarkMode tr.uir-machine-totals-row > td {
                background-color: var(--dark-1) !important;
              }
              
              tfoot > tr.uir-machine-totals-row:first-child > td {
                border-top: 2px #ddd solid !important;
              }
              
              html.isDarkMode tfoot > tr.uir-machine-totals-row > td {
                border-top-color: var(--dark-3, #3e3f42) !important;
              }
              
              .uir-machine-totals-row:last-child > td {
                border-bottom: 0 !important;
              }
              
              html[data-path] #${sublistId}_splits > tfoot {
                position: sticky;
                bottom: 0;
                z-index: 1;
              }
            </style>
          `;
        
        response.writePage(form);
      }
    };
    
    /** @type {Object<string, string>} */
    const dateFormatMap = {
      'M/D/YYYY': 'fmMM/DD/YYYY',
      'D/M/YYYY': 'fmDD/MM/YYYY',
      'D-Mon-YYYY': 'fmDD-Mon-YYYY',
      'D.M.YYYY': 'fmDD.MM.YYYY',
      'D-MONTH-YYYY': 'fmDD-Month-YYYY',
      'D MONTH, YYYY': 'fmDD Month, YYYY',
      'YYYY/M/D': 'fmYYYY/MM/DD',
      'YYYY-M-D': 'fmYYYY-MM-DD',
      'DD/MM/YYYY': 'DD/MM/YYYY',
      'DD-Mon-YYYY': 'DD-fmMon-YYYY',
      'DD.MM.YYYY': 'DD.MM.YYYY',
      'DD-MONTH-YYYY': 'DD-fmMonth-YYYY',
      'DD MONTH, YYYY': 'DD fmMonth, YYYY',
      'MM/DD/YYYY': 'MM/DD/YYYY',
      'YYYY/MM/DD': 'YYYY/MM/DD',
      'YYYY-MM-DD': 'YYYY-MM-DD',
    };
    
    /** @type {string} */
    let sqlDateFormat;
    
    /** @return {string} */
    const getSqlDateFormat = () => sqlDateFormat ??= dateFormatMap[runtime.getCurrentUser().getPreference('DATEFORMAT')];
    
    /**
     * @param {Object} options
     * @param {typeof FilterField} options.FilterField
     * @param {Object<string, string>} options.parameters
     * @param {FilterFieldInterface[]} options.filterFields
     * @return {void}
     */
    const getFilters = ({FilterField, parameters, filterFields}) =>
      filterFields.forEach((
        {
          key,
          id,
          type,
          options,
          csv = true,
          defaultValue,
          source,
          textQuery,
        },
      ) => {
        
        /** @type {string|string[]|number|boolean|Date} */
        const value = parameters[id] ?? defaultValue;
        const values = type === serverWidget.FieldType.MULTISELECT ? Array.isArray(value) ? value : (value ?? '')?.split(/[\u0005,]/g)?.filter(s => s) : value;
        /** @type {string} */
        const text = (() => {
          // const values = (value ?? '').split('\u0005').filter(s => s);
          const sourceText = source && textQuery ? processSuiteQL(
            textQuery.replace('@@values@@', `'${values.join('\',\'')}'`),
          ).map(o => Object.values(o)[0]).join(',') : '';
          if (typeof value === 'undefined') return value;
          
          switch (type) {
            case serverWidget.FieldType.CHECKBOX:
              return value ? 'Yes' : 'No';
            case serverWidget.FieldType.SELECT:
              return sourceText ?
                sourceText
                :
                options?.find(({value: optVal}) => `${value}` === `${optVal}`)?.text ?? `${value}`;
            case serverWidget.FieldType.MULTISELECT:
              return sourceText ?
                sourceText
                :
                values.map(val => options.find(({value: optVal}) => val === optVal)?.text ?? val.toString()).join(', ');
          }
          return `${value}`;
        })();
        Object.assign(FilterField[key], {value: values, text, csv});
      });
    
    /**
     * @param {Object} options
     * @param {string} [options.title = '']
     * @param {FilterFieldInterface[]} options.filterFields
     * @param {ColumnFieldInterface[]} options.columnFields
     * @param {string} clientScriptModulePath
     * @param {serverWidget.SublistType} sublistType
     * @return {{
     *   form: serverWidget.Form,
     *   sublist: serverWidget.Sublist,
     * }}
     */
    const createForm = ({title = '', filterFields, columnFields, additionalFields, clientScriptModulePath, sublistType}) => {
      /** @type {serverWidget.Form} */
      const form = serverWidget.createForm(`${title} Report`.trim());
      form.clientScriptModulePath = clientScriptModulePath;
      
      form.addSubmitButton('Submit');
      
      form.addButton({
        id: 'reset',
        label: 'Reset',
        functionName: 'resetButton' + `()`,
      });
      
      form.addButton({
        id: 'download_csv',
        label: 'Download CSV',
        functionName: 'downloadButton' + '()',
      });
      
      /*form.addButton({
        id: 'download_csv',
        label: 'Download XLS',
        functionName: 'downloadButton' + '(true)',
      });*/
      
      if (Array.isArray(filterFields))
        filterFields.forEach((
          {
            id,
            label,
            help = label,
            type,
            source,
            options,
            displayType,
            breakType,
            layoutType,
            mandatory = false,
            defaultValue,
            emptyDefault = true,
            height,
            width,
          },
        ) => {
          /** @type {serverWidget.Field} */
          const field = form.addField({id, label, type, source});
          if (height && width)
            field.updateDisplaySize({height, width});
          if (help)
            field.setHelpText({help});
          if (Array.isArray(options)) {
            if (emptyDefault) field.addSelectOption({value: '', text: ''});
            options.forEach(option => field.addSelectOption(option));
          }
          if (displayType)
            field.updateDisplayType({displayType});
          if (breakType)
            field.updateBreakType({breakType});
          if (layoutType)
            field.updateLayoutType({layoutType});
          field.isMandatory = mandatory;
          if (typeof defaultValue !== 'undefined')
            field.defaultValue = defaultValue;
        });
      
      /** @type {serverWidget.Sublist} */
      const sublist = form.addSublist({
        id: 'results',
        type: sublistType,
        label: 'Results',
      });
      
      if (Array.isArray(columnFields))
        columnFields.forEach((
          {
            id,
            label,
            type,
            displayType, //= serverWidget.FieldDisplayType.INLINE,
          },
        ) => {
          const field = sublist.addField({id, label, type});
          if (displayType)
            field.updateDisplayType({
              displayType,
            });
        });
      if (Array.isArray(additionalFields))
        additionalFields.forEach(({label, id, type, displayType = serverWidget.FieldDisplayType.NORMAL}) => {
          form.addField({label, id, type}).updateDisplayType({displayType});
        });
      
      return {form, sublist};
    };
    
    /**
     * @param {Object} options
     * @param {string} options.text
     * @param {record.Type|string} options.recordType
     * @param {number|string} options.recordId
     * @return {string}
     */
    const hyperlinkHtml = ({text, recordType, recordId, style}) =>
      `<a ${style ? ` style='${style}' ` : ''} href="${resolveRecordUrl({
        recordType,
        recordId,
      })}" class="dottedlink">${text}</a>`;
    
    /**
     * @typedef {Object} CellProperties
     * @property {string|number} value
     * @property {string} [text]
     */
    
    /**
     * @param {[ColumnField & ColumnFieldInterface, CellProperties][]} cells
     * @return {Object<string, string|number>}
     */
    const processResult = cells => cells.reduce(
      (row, [{id, recordType, style}, {value, text}]) => {
        
        if (text && recordType) {
          row[id] = text;
          row[`${id}_html`] = hyperlinkHtml({text, recordType, recordId: value});
        }
        else if (value != null && value !== '') {
          row[id] = value;
        }
        return row;
      },
      /** @type {Object<string, string|number>} */ {},
    );
    
    /**
     * @param {Object} options
     * @param {serverWidget.Sublist} options.sublist
     * @param {ColumnFieldInterface[]} options.columnFields
     * @param {Object<string, string|number>[]} options.results - {fieldId1:value, fieldId2:value}[]
     * @return {void}
     */
    const fillSublist = ({sublist, columnFields, results}) => {
      sublist.label += ` (${format.format({
        type: format.Type.INTEGER,
        value: results.length,
      })})`;
      results.forEach(
        (result) => {
          log.debug('Result', result);
          
          const line = sublist.lineCount === -1 ? 0 : sublist.lineCount;
          columnFields.forEach(({label, recordType, id}) => {
            // log.debug('Setting:', {id, line, value: recordType ? result[`${id}_html`] : result[id], result,})
            
            if (result[id] === null || result[id] === undefined) return;
            
            sublist.setSublistValue({
              id, line,
              value: recordType ? result[`${id}_html`] : (result[id]),
            });
          });
        });
    };
    
    /**
     * @param {Object} options
     * @param {string} [options.title = '']
     * @param {string} [note]
     * @param {FilterFieldInterface[]} options.filterFields
     * @param {ColumnFieldInterface[]} options.columnFields
     * @param {Object<string, string|number>[]} [options.results = []]
     * @param {ExportTotals} totals
     * @return {file.File}
     */
    const createCsvFile = (
      {
        title = '',
        note,
        filterFields,
        columnFields,
        results = [],
        totals,
      },
    ) => {
      /**
       * @param {string|number} [text = '']
       * @return {string}
       */
      const createCell = (text = '') => {
        text = `${text == null ? '' : text}`;
        return text.match(/(^ )|( $)|[,"\n]/) ? `"${text.replace(/"/g, '""')}"` : text;
      };
      
      /** @type {string[]} */
      const detailRows = Object.entries({
        'Report Name': title,
        'Run Date/Time': format.format({
          type: format.Type.DATETIME,
          value: new Date(),
        }),
      }).map(([label, value]) => [`${label.toUpperCase()}:`, value].map(createCell).join());
      
      /** @type {string[]} */
      const filterRows = filterFields.filter(({csv}) => csv).map((val) => {
        const {label, text = ''} = val;
        return [
          `${label.toUpperCase()}:`,
          text,
        ].map(createCell).join();
      });
      
      /** @type {string[]} */
      const noteRows = note ? [
        createCell(note),
        /* Empty row */ '',
      ] : [];
      
      /** @type {string} */
      const headerRow = columnFields.reduce((acc, {
        label,
        csv = true,
      }) => csv ? acc.concat(createCell(label.toUpperCase())) : acc, []).join();
      const reg = new RegExp('>(.*?)</');
      /** @type {string[]} */
      const resultRows = results.map(result => columnFields.filter(({csv = true}) => csv).map(({id, type, formatting}) =>
        createCell((() => {
          // log.debug('result:', result);
          // log.debug('{formatting, id, type, result: result[id]}:', {formatting, id, type, result: result[id]})
          const unformattedValue = formatting && result[id] ? result[id].toString().match(reg)['1'] ?? result[id] : result[id];
          switch (type) {
            case serverWidget.FieldType.FLOAT:
            case serverWidget.FieldType.INTEGER:
            case serverWidget.FieldType.CURRENCY:
            case serverWidget.FieldType.PERCENT:
              return (unformattedValue?.toFixed?.(2) ?? '') + (type === serverWidget.FieldType.PERCENT ? '%' : '');
          }
          return unformattedValue;
        })()),
      ).join());
      
      /** @type {string} */
      const mainTotalsRow = !Object.keys(totals.main).length ? '' : columnFields.filter(({total = true, csv = true}) => csv && total).map(
        ({id}, index) =>
          createCell(index === totals.labelColumnIndex ? 'Totals' : totals.main[id]?.value ?? ''),
      ).join();
      
      /** @type {string[]} */
      const additionalTotalRows = totals.additionalRows.map(
        ({index: colIndex, label = '', text = ''}) =>
          columnFields.map(
            (_, index) =>
              createCell(index === totals.labelColumnIndex ? label : (index === colIndex ? text : '')),
          ).join(),
      );
      
      /** @type {string} */
      const contents = [
        ...detailRows,
        ...filterRows,
        /* Empty row */ '',
        ...noteRows,
        headerRow,
        ...resultRows,
        mainTotalsRow,
        ...additionalTotalRows,
      ].join('\n');
      
      return file.create({
        name: `${title}.csv`,
        contents,
        fileType: file.Type.CSV,
        encoding: file.Encoding.UTF_8,
      });
    };
    
    /**
     * @param {Object} options
     * @param {string} [options.title = '']
     * @param {string} [note]
     * @param {FilterFieldInterface[]} options.filterFields
     * @param {ColumnFieldInterface[]} options.columnFields
     * @param {Object<string, string|number>[]} [options.results = []]
     * @param {ExportTotals} totals
     * @return {file.File}
     */
    const createXlsFile = (
      {
        title = '',
        note,
        filterFields,
        columnFields,
        results = [],
        totals,
      },
    ) => {
      /**
       * @param {string|number} [value = '']
       * @param {serverWidget.FieldType} [type]
       * @return {string}
       */
      const createCell = (value = '', type) => {
        switch (type) {
          case serverWidget.FieldType.INTEGER:
            return /* language=XML */ `
              <Cell>
                ${value === '' || value == null ? '' : `<Data ss:Type="Number">${value}</Data>`}
              </Cell>
            `;
          case serverWidget.FieldType.FLOAT:
          case serverWidget.FieldType.CURRENCY:
            return /* language=XML */ `
              <Cell ss:StyleID="${serverWidget.FieldType.FLOAT}">
                ${value === '' || value == null ? '' : `<Data ss:Type="Number">${value}</Data>`}
              </Cell>
            `;
          case serverWidget.FieldType.PERCENT:
            return /* language=XML */ `
              <Cell ss:StyleID="${type}">
                ${value === '' || value == null ? '' : `<Data ss:Type="Number">${value / 100}</Data>`}
              </Cell>
            `;
        }
        return /* language=XML */ `
          <Cell>
            <Data ss:Type="String">${value || ''}</Data>
          </Cell>
        `;
      };
      
      /**
       * @param {string[]} [cellsXml = []]
       * @return {string}
       */
      const createRow = (cellsXml = []) => `<Row>${cellsXml.join('')}</Row>`;
      
      /** @type {string[]} */
      const detailRows = Object.entries({
        'Report Name': title,
        'Run Date/Time': format.format({
          type: format.Type.DATETIME,
          value: new Date(),
        }),
      }).map(([label, value]) => createRow([`${label.toUpperCase()}:`, value].map(createCell)));
      
      /** @type {string[]} */
      const filterRows = filterFields.filter(({csv}) => csv).map(
        ({label, text = ''}) => createRow([
          `${label.toUpperCase()}:`,
          text,
        ].map(createCell)),
      );
      
      /** @type {string} */
      const emptyRow = createRow();
      
      /** @type {string[]} */
      const noteRows = note ? [
        createRow([createCell(note)]),
        emptyRow,
      ] : [];
      
      /** @type {string} */
      const headerRow = createRow(columnFields.map(({label}) => createCell(label.toUpperCase())));
      
      /** @type {string[]} */
      const resultRows = results.map(result =>
        createRow(columnFields.map(({id, type}) => createCell(result[id], type))),
      );
      
      /** @type {string} */
      const mainTotalsRow = !Object.keys(totals.main).length ? '' : createRow(columnFields.map(
        ({id, type}, index) =>
          createCell(index === totals.labelColumnIndex ? 'Totals' : totals.main[id]?.value ?? '', type),
      ));
      
      /** @type {string[]} */
      const additionalTotalRows = totals.additionalRows.map(
        ({index: colIndex, label = '', value = ''}) =>
          createRow(columnFields.map(({type}, index) => {
            /** @type {string|null} */
            const cellValue = index === totals.labelColumnIndex ? label : (index === colIndex ? value : null);
            return createCell(cellValue, cellValue === null ? null : type);
          })),
      );
      
      /** @type {string} */
      const contentRows = [
        ...detailRows,
        ...filterRows,
        emptyRow,
        ...noteRows,
        headerRow,
        ...resultRows,
        mainTotalsRow,
        ...additionalTotalRows,
      ].join('');
      
      /** @type {string} */ // language=XML
      const contents = `
        <?xml version="1.0"?>
        <?mso-application progid="Excel.Sheet"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                  xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:x="urn:schemas-microsoft-com:office:excel"
                  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
                  xmlns:html="http://www.w3.org/TR/REC-html40">
          <Styles>
            <Style ss:ID="${serverWidget.FieldType.FLOAT}">
              <NumberFormat ss:Format="#,##0.00"/>
            </Style>
            <Style ss:ID="${serverWidget.FieldType.PERCENT}">
              <NumberFormat ss:Format="Percent"/>
            </Style>
          </Styles>
          <Worksheet ss:Name="${sublistLabel}">
            <Table>
              ${contentRows}
            </Table>
          </Worksheet>
        </Workbook>
      `;
      
      /** @type {string} */
      const encodedContents = encode.convert({
        string: contents,
        inputEncoding: encode.Encoding.UTF_8,
        outputEncoding: encode.Encoding.BASE_64,
      });
      
      return file.create({
        name: `${title}.xls`,
        contents: encodedContents,
        fileType: file.Type.EXCEL,
        encoding: file.Encoding.UTF_8,
      });
    };
    
    /**
     * @param {string} suiteQL
     * @return {Object<string, string|number>[]}
     */
    const processSuiteQL = suiteQL => {
      /** @type {query.PagedData} */
      const pagedData = query.runSuiteQLPaged({query: suiteQL, pageSize: 1000});
      return pagedData.pageRanges.reduce(
        (results, _, index) => results.concat(pagedData.fetch({index}).data.asMappedResults()),
        /** @type {Object<string, string|number>[]} */ [],
      );
    };
    
    /**
     * @param {string} [suiteQL]
     * @param {string} [key = 'id']
     * @return {Object<string, Object<string, string|number>>}
     */
    const getQueryResultsAsObject = ({suiteQL, key = 'id'}) => Object.fromEntries(
      processSuiteQL(suiteQL).map(result => [result[key], result]),
    );
    
    /**
     * @param {typeof FilterField} FilterField
     * @return {Object<string, string>}
     */
    const getFilterValues = FilterField => Object.fromEntries(
      Object.entries(FilterField).map(([key, {value}]) => [key, /** @type {string} */ value]),
    );
    
    /**
     * @param {ColumnFieldInterface[]} columnFields
     * @param {ColumnField} columnField
     * @return {void}
     */
    const deleteColumn = (columnFields, columnField) => {
      /** @type {number} */
      const index = columnFields.findIndex(({id}) => id === columnField.id);
      if (index !== -1)
        columnFields.splice(index, 1);
    };
    
    return {
      createSuitelet,
      processResult,
      getSqlDateFormat,
      processSuiteQL,
      getQueryResultsAsObject,
      deleteColumn,
    };
  },
);
