import { Filter, Locale, resources, StringMap } from "./core";
import { clone } from "./reflect";

export interface Sortable {
  sortField?: string;
  sortType?: string;
  sortTarget?: HTMLElement;
}

export interface Pagination {
  initPageSize?: number;
  pageSize: number;
  // limit: number;
  pageIndex?: number;
  total?: number;
  pages?: number;
  showPaging?: boolean;
  append?: boolean;
  appendMode?: boolean;
  appendable?: boolean;
}

interface Searchable extends Pagination, Sortable {
}

export function getOffset(limit: number, page?: number, firstLimit?: number): number {
  const p = page && page > 0 ? page : 1
  if (firstLimit && firstLimit > 0) {
    const offset = limit * (p - 2) + firstLimit
    return offset < 0 ? 0 : offset
  } else {
    const offset = limit * (p - 1)
    return offset < 0 ? 0 : offset
  }
}
export function mergeFilter<S extends Filter>(obj: S, b?: S, pageSizes?: number[], arrs?: string[] | any) {
  let a: any = b
  if (!b) {
    a = {}
  }
  const keys = Object.keys(obj)
  for (const key of keys) {
    const p = a[key]
    const v = (obj as any)[key]
    if (v && v !== "") {
      a[key] = isArray(key, p, arrs) ? v.split(",") : v
    }
  }
  const spage: any = obj["page"]
  if (!isNaN(spage)) {
    const page = parseInt(spage, 10)
    a.page = page > 1 ? page : undefined
  }
  const slimit: any = obj["limit"]
  if (!isNaN(slimit)) {
    const limit = parseInt(slimit, 10)
    if (pageSizes && pageSizes.length > 0) {
      if (pageSizes.indexOf(limit) >= 0) {
        a.limit = limit
        return a
      }
    } else {
      a.limit = limit > 0 ? limit : 12
    }
  }
  return a
}
export function isArray(key: string, p: any, arrs: string[]|any): boolean {
  if (p) {
    if (Array.isArray(p)) {
      return true;
    }
  }
  if (arrs) {
    if (Array.isArray(arrs)) {
      if (arrs.indexOf(key) >= 0) {
        return true;
      }
    } else {
      const v = arrs[key];
      if (v && Array.isArray(v)) {
        return true;
      }
    }
  }
  return false;
}

// m is search model or an object which is parsed from url
export function initFilter<S extends Filter>(m: S, com: Searchable): S {
  if (!isNaN(m.page as any)) {
    const page = parseInt(m.page as any, 10);
    m.page = page;
    if (page >= 1) {
      com.pageIndex = page;
    }
  }
  if (!isNaN(m.limit as any)) {
    const pageSize = parseInt(m.limit as any, 10);
    m.limit = pageSize;
    if (pageSize > 0) {
      com.pageSize = pageSize;
    }
  }
  if (!m.limit && com.pageSize) {
    m.limit = com.pageSize;
  }
  if (!isNaN(m.firstLimit as any)) {
    const initPageSize = parseInt(m.firstLimit as any, 10);
    if (initPageSize > 0) {
      m.firstLimit = initPageSize;
      com.initPageSize = initPageSize;
    } else {
      com.initPageSize = com.pageSize;
    }
  } else {
    com.initPageSize = com.pageSize;
  }
  const st = m.sort;
  if (st && st.length > 0) {
    const ch = st.charAt(0);
    if (ch === '+' || ch === '-') {
      com.sortField = st.substring(1);
      com.sortType = ch;
    } else {
      com.sortField = st;
      com.sortType = '';
    }
  }
  /*
  delete m.page;
  delete m.limit;
  delete m.firstLimit;
  */
  return m;
}
export function more(com: Pagination): void {
  com.append = true;
  if (!com.pageIndex) {
    com.pageIndex = 1;
  } else {
    com.pageIndex = com.pageIndex + 1;
  }
}

export function reset(com: Searchable): void {
  removeSortStatus(com.sortTarget);
  com.sortTarget = undefined;
  com.sortField = undefined;
  com.append = false;
  com.pageIndex = 1;
}
export function changePageSize(com: Pagination, size: number): void {
  com.initPageSize = size;
  com.pageSize = size;
  com.pageIndex = 1;
}
export function changePage(com: Pagination, pageIndex: number, pageSize: number): void {
  com.pageIndex = pageIndex;
  com.pageSize = pageSize;
  com.append = false;
}
export function optimizeFilter<S extends Filter>(obj: S, searchable: Searchable, fields?: string[]): S {
  // const sLimit = searchable.limit;
  obj.fields = fields;
  if (searchable.pageIndex && searchable.pageIndex > 1) {
    obj.page = searchable.pageIndex;
  } else {
    delete obj.page;
  }
  obj.limit = searchable.pageSize;

  if (searchable.appendMode && searchable.initPageSize !== searchable.pageSize) {
    obj.firstLimit = searchable.initPageSize;
  } else {
    delete obj.firstLimit;
  }
  if (searchable.sortField && searchable.sortField.length > 0) {
    obj.sort = (searchable.sortType === '-' ? '-' + searchable.sortField : searchable.sortField);
  } else {
    delete obj.sort;
  }
  if(searchable) {
    mapObjects(obj, searchable as any);
  }
  return obj;
}

function mapObjects(dest: any, src: any): void {
  for (let key in dest) {
    if (src.hasOwnProperty(key) && src[key] !== null && src[key] !== undefined) {
      if(Array.isArray(dest[key]) && typeof src[key] === 'string' && src[key].length > 0) {
          const arrayObjKeySrc = src[key].length > 0 ?  (src[key])?.split(',') : [];
          if(arrayObjKeySrc && arrayObjKeySrc.length > 1) {
            dest[key] = [...arrayObjKeySrc];
          } else {
            dest[key] = [];
            dest[key].push(src[key])
          }
      } else {
        dest[key] = src[key];
      }
    }
  }
}

export function append<T>(list?: T[], results?: T[]): T[] {
  if (list && results) {
    for (const obj of results) {
      list.push(obj);
    }
  }
  if (!list) {
    return [];
  }
  return list;
}
/*
export function showResults<T>(com: Pagination, s: Filter, list: T[], total?: number, nextPageToken?: string): void {
  com.pageIndex = (s.page && s.page >= 1 ? s.page : 1);
  if (total) {
    com.itemTotal = total;
  }
  if (com.appendMode) {
    let limit = s.limit;
    if (s.page <= 1 && s.firstLimit && s.firstLimit > 0) {
      limit = s.firstLimit;
    }
    handleAppend(com, limit, list, nextPageToken);
  } else {
    showPaging(com, s.limit, list, total);
  }
}
*/
export function handleAppend<T>(com: Pagination, list: T[], limit?: number, nextPageToken?: string): void {
  if (!limit || limit === 0) {
    com.appendable = false;
  } else {
    if (!nextPageToken || nextPageToken.length === 0 || list.length < limit) {
      com.appendable = false;
    } else {
      com.appendable = true;
    }
  }
  if (!list || list.length === 0) {
    com.appendable = false;
  }
}
export function showPaging<T>(com: Pagination, list: T[], pageSize?: number, total?: number): void {
  com.total = total;
  const pageTotal = getPageTotal(pageSize, total);
  com.pages = pageTotal;
  com.showPaging = (!total || com.pages <= 1 || (list && list.length >= total) ? false : true);
}

export function getFields(form?: HTMLFormElement, arr?: string[]): string[] | undefined {
  if (arr && arr.length > 0) {
    return arr
  }
  if (!form) {
    return undefined
  }
  let nodes = form.nextSibling as HTMLElement
  if (!nodes.querySelector) {
    if (!form.nextSibling) {
      return []
    } else {
      nodes = form.nextSibling.nextSibling as HTMLElement
    }
  }
  if (!nodes.querySelector) {
    return undefined
  }
  const table = nodes.querySelector("table")
  const fields: string[] = []
  if (table) {
    const thead = table.querySelector("thead")
    if (thead) {
      const ths = thead.querySelectorAll("th")
      if (ths) {
        const l = ths.length
        for (let i = 0; i < l; i++) {
          const th = ths[i]
          const field = th.getAttribute("data-field")
          if (field) {
            fields.push(field)
          }
        }
      }
    }
  }
  return fields.length > 0 ? fields : undefined
}
interface Component<T> {
  pageIndex?: number;
  pageSize?: number;
  initPageSize?: number;
  sequenceNo?: string;
  format?: (oj: T, lc?: Locale) => T;
}
export function formatResultsByComponent<T>(results: T[], c: Component<T>, lc: Locale) {
  formatResults(results, c.pageIndex, c.pageSize, c.pageSize, c.sequenceNo, c.format, lc);
}
export function formatResults<T>(results: T[], pageIndex?: number, pageSize?: number, initPageSize?: number, sequenceNo?: string, ft?: (oj: T, lc?: Locale) => T, lc?: Locale): void {
  if (results && results.length > 0) {
    let hasSequencePro = false;
    if (ft) {
      if (sequenceNo && sequenceNo.length > 0) {
        for (const obj of results) {
          if ((obj as any)[sequenceNo]) {
            hasSequencePro = true;
          }
          ft(obj, lc);
        }
      } else {
        for (const obj of results) {
          ft(obj, lc);
        }
      }
    } else if (sequenceNo && sequenceNo.length > 0) {
      for (const obj of results) {
        if ((obj as any)[sequenceNo]) {
          hasSequencePro = true;
        }
      }
    }
    if (sequenceNo && sequenceNo.length > 0 && !hasSequencePro) {
      if (!pageIndex) {
        pageIndex = 1;
      }
      if (pageSize) {
        if (!initPageSize) {
          initPageSize = pageSize;
        }
        if (pageIndex <= 1) {
          for (let i = 0; i < results.length; i++) {
            (results[i] as any)[sequenceNo] = i - pageSize + pageSize * pageIndex + 1;
          }
        } else {
          for (let i = 0; i < results.length; i++) {
            (results[i] as any)[sequenceNo] = i - pageSize + pageSize * pageIndex + 1 - (pageSize - initPageSize);
          }
        }
      } else {
        for (let i = 0; i < results.length; i++) {
          (results[i] as any)[sequenceNo] = i + 1;
        }
      }
    }
  }
}

export function getPageTotal(pageSize?: number, total?: number): number {
  if (!pageSize || pageSize <= 0) {
    return 1;
  } else {
    if (!total) {
      total = 0;
    }
    if ((total % pageSize) === 0) {
      return Math.floor((total / pageSize));
    }
    return Math.floor((total / pageSize) + 1);
  }
}

export function formatText(...args: any[]): string {
  let formatted = args[0]
  if (!formatted || formatted === "") {
    return ""
  }
  if (args.length > 1 && Array.isArray(args[1])) {
    const params = args[1]
    for (let i = 0; i < params.length; i++) {
      const regexp = new RegExp("\\{" + i + "\\}", "gi")
      formatted = formatted.replace(regexp, params[i])
    }
  } else {
    for (let i = 1; i < args.length; i++) {
      const regexp = new RegExp("\\{" + (i - 1) + "\\}", "gi")
      formatted = formatted.replace(regexp, args[i])
    }
  }
  return formatted
}
export function buildMessage<T>(resource: StringMap, results: T[], pageSize: number, pageIndex: number | undefined, total?: number): string {
  if (!results || results.length === 0) {
    return resource.msg_no_data_found
  } else {
    if (!pageIndex) {
      pageIndex = 1
    }
    const fromIndex = (pageIndex - 1) * pageSize + 1
    const toIndex = fromIndex + results.length - 1
    const pageTotal = getPageTotal(pageSize, total)
    if (pageTotal > 1) {
      const msg2 = formatText(resource.msg_search_result_page_sequence, fromIndex, toIndex, total, pageIndex, pageTotal)
      return msg2
    } else {
      const msg3 = formatText(resource.msg_search_result_sequence, fromIndex, toIndex)
      return msg3
    }
  }
}

function removeFormatUrl(url: string): string {
  const startParams = url.indexOf('?');
  return startParams !== -1 ? url.substring(0, startParams) : url;
}


function getPrefix(url: string): string {
  return url.indexOf("?") >= 0 ? "&" : "?"
}
export function addParametersIntoUrl<S extends Filter>(ft: S, isFirstLoad?: boolean, page?: number, fields?: string, limit?: string): void {
  if (!isFirstLoad) {
    if (!fields || fields.length === 0) {
      fields = 'fields';
    }
    if (!limit || limit.length === 0) {
      limit = 'limit';
    }
    if (page && page > 1) {
      if (!ft.page || ft.page <= 1) {
        ft.page = page;
      }
    }
    const pageIndex = ft.page;
    if (pageIndex && !isNaN(pageIndex) && pageIndex <= 1) {
      delete ft.page;
    }
    const keys = Object.keys(ft);
    const currentUrl = window.location.host + window.location.pathname;
    let url = removeFormatUrl(currentUrl);
    for (const key of keys) {
      const objValue = (ft as any)[key];
      if (objValue) {
        if (key !== fields) {
          if (typeof objValue === 'string' || typeof objValue === 'number') {
            if (key === limit) {
              if (objValue !== resources.limit) {
                url += getPrefix(url) + `${key}=${objValue}`;
              }
            } else {
              url += getPrefix(url) + `${key}=${objValue}`;
            }
          } else if (typeof objValue === 'object') {
            if (objValue instanceof Date) {
              url += getPrefix(url) + `${key}=${objValue.toISOString()}`;
            } else {
              if (Array.isArray(objValue)) {
                if (objValue.length > 0) {
                  const strs: string[] = [];
                  for (const subValue of objValue) {
                    if (typeof subValue === 'string') {
                      strs.push(subValue);
                    } else if (typeof subValue === 'number') {
                      strs.push(subValue.toString());
                    }
                  }
                  url += getPrefix(url) + `${key}=${strs.join(',')}`;
                }
              } else {
                const keysLvl2 = Object.keys(objValue);
                for (const key2 of keysLvl2) {
                  const objValueLvl2 = objValue[key2];
                  if (objValueLvl2 instanceof Date) {
                    url += getPrefix(url) + `${key}.${key2}=${objValueLvl2.toISOString()}`;
                  } else {
                    url += getPrefix(url) + `${key}.${key2}=${objValueLvl2}`;
                  }
                }
              }
            }
          }
        }
      }
    }
    let p = 'http://';
    const loc = window.location.href;
    if (loc.length >= 8) {
      const ss = loc.substring(0, 8);
      if (ss === 'https://') {
        p = 'https://';
      }
    }
    window.history.replaceState({path: currentUrl}, '', p + url);
  }
}

export interface Sort {
  field?: string;
  type?: string;
}
export function buildSort(sort?: string | null): Sort {
  const sortObj: Sort = {}
  if (sort && sort.length > 0) {
    const ch = sort.charAt(0)
    if (ch === "+" || ch === "-") {
      sortObj.field = sort.substring(1)
      sortObj.type = ch
    } else {
      sortObj.field = sort
      sortObj.type = ""
    }
  }
  return sortObj
}
export function setSort(sortable: Sortable, sort: string | undefined | null) {
  const st = buildSort(sort);
  sortable.sortField = st.field;
  sortable.sortType = st.type;
}
export function buildSortFilter<S extends Filter>(obj: S, sortable: Sortable): S {
  const filter: any = clone(obj)
  if (sortable.sortField && sortable.sortField.length > 0) {
    filter.sort = sortable.sortType === "-" ? "-" + sortable.sortField : sortable.sortField
  } else {
    delete filter.sort
  }
  delete filter.fields
  return filter
}
export function handleToggle(target?: HTMLElement, on?: boolean): boolean {
  const off = !on
  if (target) {
    if (on) {
      if (!target.classList.contains('on')) {
        target.classList.add('on');
      }
    } else {
      target.classList.remove('on');
    }
  }
  return off
}
export function handleSortEvent(event: Event, com: Sortable): void {
  if (event && event.target) {
    const target = event.target as HTMLElement;
    const s = handleSort(target, com.sortTarget, com.sortField, com.sortType);
    com.sortField = s.field;
    com.sortType = s.type;
    com.sortTarget = target;
  }
}

export function getSortElement(target: HTMLElement): HTMLElement {
  return target.nodeName === "I" ? (target.parentElement as HTMLElement) : target
}
export function handleSort(target: HTMLElement, previousTarget?: HTMLElement, sortField?: string, sortType?: string): Sort {
  const type = target.getAttribute('sort-type');
  const field = toggleSortStyle(target);
  const s = sort(sortField, sortType, field, type == null ? undefined : type);
  if (sortField !== field) {
    removeSortStatus(previousTarget);
  }
  return s;
}

export function sort(preField?: string, preSortType?: string, field?: string, sortType?: string): Sort {
  if (!preField || preField === '') {
    const s: Sort = {
      field,
      type: '+'
    };
    return s;
  } else if (preField !== field) {
    const s: Sort = {
      field,
      type: (!sortType ? '+' : sortType)
    };
    return s;
  } else if (preField === field) {
    const type = (preSortType === '+' ? '-' : '+');
    const s: Sort = {field, type};
    return s;
  } else {
    return {field, type: sortType};
  }
}

export function removeSortStatus(target?: HTMLElement): void {
  if (target && target.children.length > 0) {
    target.removeChild(target.children[0]);
  }
}

export function toggleSortStyle(target: HTMLElement): string {
  let field = target.getAttribute('data-field');
  if (!field) {
    const p = target.parentNode as HTMLElement;
    if (p) {
      field = p.getAttribute('data-field');
    }
  }
  if (!field || field.length === 0) {
    return '';
  }
  if (target.nodeName === 'I') {
    target = target.parentNode as HTMLElement;
  }
  let i = null;
  if (target.children.length === 0) {
    target.innerHTML = target.innerHTML + '<i class="sort-up"></i>';
  } else {
    i = target.children[0];
    if (i.classList.contains('sort-up')) {
      i.classList.remove('sort-up');
      i.classList.add('sort-down');
    } else if (i.classList.contains('sort-down')) {
      i.classList.remove('sort-down');
      i.classList.add('sort-up');
    }
  }
  return field;
}
export function getModel<S extends Filter>(state: any, modelName: string, searchable: Searchable, fields?: string[], excluding?: string[]|number[]): S {
  let obj2 = getModelFromState(state, modelName);

  const obj: any = obj2 ? obj2 : {};
  const obj3 = optimizeFilter(obj, searchable, fields);
  obj3.excluding = excluding;
  return obj3;
}
function getModelFromState(state: any, modelName: string): any {
  if (!modelName || modelName.length === 0) {
    return state;
  }
  if (!state) {
    return state;
  }
  return state[modelName];
}
export function getFieldsFromForm(fields?: string[], initFields?: boolean, form?: HTMLFormElement|null): string[]|undefined {
  if (fields && fields.length > 0) {
    return fields;
  }
  if (!initFields) {
    if (form) {
      return getFields(form);
    }
  }
  return fields;
}
export function validate<S extends Filter>(se: S, callback: () => void, form?: HTMLFormElement|null, lc?: Locale, vf?: (f: HTMLFormElement, lc2?: Locale, focus?: boolean, scr?: boolean) => boolean): void {
  let valid = true;
  if (form && vf) {
    valid = vf(form, lc);
  }
  if (valid === true) {
    callback();
  }
}
