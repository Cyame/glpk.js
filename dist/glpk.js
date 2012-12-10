/*! glpk - v4.47.0 - 2012-12-10
* https://github.com/hgourvest/glpk.js
* Copyright (c) 2012 Henri Gourvest; Licensed GPL */

(function(exports) {

/***********************************************************************
 *  This code is part of GLPK (GNU Linear Programming Kit).
 *
 *  Copyright (C) 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008,
 *  2009, 2010, 2011 Andrew Makhorin, Department for Applied Informatics,
 *  Moscow Aviation Institute, Moscow, Russia. All rights reserved.
 *  E-mail: <mao@gnu.org>.
 *
 *  GLPK is free software: you can redistribute it and/or modify it
 *  under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  GLPK is distributed in the hope that it will be useful, but WITHOUT
 *  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 *  or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
 *  License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with GLPK. If not, see <http://www.gnu.org/licenses/>.
 ***********************************************************************/

const
    GLP_DEBUG = true,
    DBL_MAX = Number.MAX_VALUE,
    INT_MAX = 0x7FFFFFFF,
    DBL_EPSILON = 0.22204460492503131E-15,
    CHAR_BIT = 1;

const
/* CAUTION: DO NOT CHANGE THE LIMITS BELOW */
    M_MAX = 100000000, /* = 100*10^6 */
/* maximal number of rows in the problem object */

    N_MAX = 100000000, /* = 100*10^6 */
/* maximal number of columns in the problem object */

    NNZ_MAX = 500000000; /* = 500*10^6 */
/* maximal number of constraint coefficients in the problem object */

const XEOF = -1;

function xerror(message){
    throw new Error(message);
}

function xassert(test){
    if (!test){
        throw new Error('assert');
    }
}

var xprintf = function(data){
    console.log(data);
};

exports.__defineGetter__("glp_print_func", function(){return xprintf});
exports.__defineSetter__("glp_print_func", function(value){xprintf = value});

function xcopyObj(dest, src){
    for (var prop in src){dest[prop] = src[prop];}
}

function xcopyArr(dest, destFrom, src, srcFrom, count){
    for (; count > 0; destFrom++, srcFrom++, count--){dest[destFrom] = src[srcFrom];}
}

function xfillArr(dest, destFrom, value, count){
    for (; count > 0; destFrom++, count--){dest[destFrom] = value;}
}

function xfillObjArr(dest, destFrom, count){
    for (; count > 0; destFrom++, count--){dest[destFrom] = {}}
}

function xtime(){
    var d = new Date();
    return d.getTime();
}

function xdifftime(to, from){
    return (to - from) / 1000;
}

function xqsort(base, idx, num, compar){
    var tmp = new Array(num);
    xcopyArr(tmp, 0, base, idx, num);
    tmp.sort(compar);
    xcopyArr(base, idx, tmp, 0, num);
}

var
    global_env = {};

function get_env_ptr(){
    return global_env;
}

var glp_version = exports.glp_version = function(){
    return GLP_MAJOR_VERSION + "." + GLP_MINOR_VERSION;
}

function isspace(c){
    return (" \t\n\v\f\r".indexOf(c) >= 0)
}

function iscntrl(c){
    var code = (typeof c == 'string')?c.charCodeAt(0):-1;
    return ((code >= 0x00 && code <= 0x1f) || code == 0x7f)
}

function isalpha(c){
    var code = (typeof c == 'string')?c.charCodeAt(0):-1;
    return (code >= 0x41 && code <= 0x5A)|| (code >= 0x61 && code <= 0x7A)
}

function isalnum(c){
    var code = (typeof c == 'string')?c.charCodeAt(0):-1;
    return (code >= 0x41 && code <= 0x5A)|| (code >= 0x61 && code <= 0x7A) || (code >= 0x30 && code <= 0x39)
}

function isdigit(c){
    var code = (typeof c == 'string')?c.charCodeAt(0):-1;
    return (code >= 0x30 && code <= 0x39)
}

function strchr(str, c){
    return str.indexOf(c)
}

function tolower(c){
    return c.toLowerCase();
}

/* glpapi.h */

var
    GLP_PROB_MAGIC = 0xD7D9D6C2;
function create_prob(lp){
    lp.magic = GLP_PROB_MAGIC;
    //lp.pool = dmp_create_pool();
    lp.parms = null;
    lp.tree = null;
    /* LP/MIP data */
    lp.name = null;
    lp.obj = null;
    lp.dir = GLP_MIN;
    lp.c0 = 0.0;
    lp.m_max = 100;
    lp.n_max = 200;
    lp.m = lp.n = 0;
    lp.nnz = 0;
    lp.row = new Array(1+lp.m_max);
    lp.col = new Array(1+lp.n_max);
    lp.r_tree = {};
    lp.c_tree = {};
    /* basis factorization */
    lp.valid = 0;
    lp.head = new Array(1+lp.m_max);
    lp.bfcp = null;
    lp.bfd = null;
    /* basic solution (LP) */
    lp.pbs_stat = lp.dbs_stat = GLP_UNDEF;
    lp.obj_val = 0.0;
    lp.it_cnt = 0;
    lp.some = 0;
    /* interior-point solution (LP) */
    lp.ipt_stat = GLP_UNDEF;
    lp.ipt_obj = 0.0;
    /* integer solution (MIP) */
    lp.mip_stat = GLP_UNDEF;
    lp.mip_obj = 0.0;
}

var glp_create_prob = exports.glp_create_prob = function(){
    var lp = {};
    create_prob(lp);
    return lp;
};

var glp_set_prob_name = exports.glp_set_prob_name = function(lp, name){
    var tree = lp.tree;
    if (tree != null && tree.reason != 0)
        xerror("glp_set_prob_name: operation not allowed");
    lp.name = name;
};

var glp_set_obj_name = exports.glp_set_obj_name = function(lp, name){
    var tree = lp.tree;
    if (tree != null && tree.reason != 0)
        xerror("glp_set_obj_name: operation not allowed");
    lp.obj = name;
};

var glp_set_obj_dir = exports.glp_set_obj_dir = function(lp, dir){
    var tree = lp.tree;
    if (tree != null && tree.reason != 0)
        xerror("glp_set_obj_dir: operation not allowed");
    if (!(dir == GLP_MIN || dir == GLP_MAX))
        xerror("glp_set_obj_dir: dir = " + dir  + "; invalid direction flag");
    lp.dir = dir;
};

var glp_add_rows = exports.glp_add_rows = function (lp, nrs){
    var tree = lp.tree;
    var row;
    /* determine new number of rows */
    if (nrs < 1)
        xerror("glp_add_rows: nrs = " + nrs + "; invalid number of rows");
    if (nrs > M_MAX - lp.m)
        xerror("glp_add_rows: nrs = " + nrs + "; too many rows");
    var m_new = lp.m + nrs;
    /* increase the room, if necessary */
    if (lp.m_max < m_new){
        while (lp.m_max < m_new){
            lp.m_max += lp.m_max;
            xassert(lp.m_max > 0);
        }
        lp.row.length = 1+lp.m_max;

        /* do not forget about the basis header */
        lp.head = new Array(1+lp.m_max);
    }
    /* add new rows to the end of the row list */
    for (var i = lp.m+1; i <= m_new; i++)
    {  /* create row descriptor */
        lp.row[i] = row = {};
        row.i = i;
        row.name = null;
        row.node = null;
        row.level = 0;
        row.origin = 0;
        row.klass = 0;
        if (tree != null)
        {  switch (tree.reason)
        {  case 0:
                break;
            case GLP_IROWGEN:
                xassert(tree.curr != null);
                row.level = tree.curr.level;
                row.origin = GLP_RF_LAZY;
                break;
            case GLP_ICUTGEN:
                xassert(tree.curr != null);
                row.level = tree.curr.level;
                row.origin = GLP_RF_CUT;
                break;
            default:
                xassert(tree != tree);
        }
        }
        row.type = GLP_FR;
        row.lb = row.ub = 0.0;
        row.ptr = null;
        row.rii = 1.0;
        row.stat = GLP_BS;
        row.bind = 0;
        row.prim = row.dual = 0.0;
        row.pval = row.dval = 0.0;
        row.mipx = 0.0;
    }
    /* set new number of rows */
    lp.m = m_new;
    /* invalidate the basis factorization */
    lp.valid = 0;
    if (tree != null && tree.reason != 0) tree.reopt = 1;
    /* return the ordinal number of the first row added */
    return m_new - nrs + 1;
};

var glp_add_cols = exports.glp_add_cols = function(lp, ncs){
    var tree = lp.tree;
    var col;
    if (tree != null && tree.reason != 0)
        xerror("glp_add_cols: operation not allowed");
    /* determine new number of columns */
    if (ncs < 1)
        xerror("glp_add_cols: ncs = " + ncs + "; invalid number of columns");
    if (ncs > N_MAX - lp.n)
        xerror("glp_add_cols: ncs = " + ncs + "; too many columns");
    var n_new = lp.n + ncs;
    /* increase the room, if necessary */
    if (lp.n_max < n_new)
    {
        while (lp.n_max < n_new)
        {  lp.n_max += lp.n_max;
            xassert(lp.n_max > 0);
        }
        lp.col.length = 1+lp.n_max;
    }
    /* add new columns to the end of the column list */
    for (var j = lp.n+1; j <= n_new; j++)
    {  /* create column descriptor */
        lp.col[j] = col = {};
        col.j = j;
        col.name = null;
        col.node = null;
        col.kind = GLP_CV;
        col.type = GLP_FX;
        col.lb = col.ub = 0.0;
        col.coef = 0.0;
        col.ptr = null;
        col.sjj = 1.0;
        col.stat = GLP_NS;
        col.bind = 0; /* the basis may remain valid */
        col.prim = col.dual = 0.0;
        col.pval = col.dval = 0.0;
        col.mipx = 0.0;
    }
    /* set new number of columns */
    lp.n = n_new;
    /* return the ordinal number of the first column added */
    return n_new - ncs + 1;
};

var glp_set_row_name = exports.glp_set_row_name = function(lp, i, name)
{
    var tree = lp.tree;
    if (!(1 <= i && i <= lp.m))
        xerror("glp_set_row_name: i = " + i + "; row number out of range");
    var row = lp.row[i];
    if (tree != null && tree.reason != 0){
        xassert(tree.curr != null);
        xassert(row.level == tree.curr.level);
    }
    if (row.name != null){
        delete(lp.r_tree[row.name]);
        row.name = null;
    }
    if (name != null){
        row.name = name;
        lp.r_tree[row.name] = row;
    }
};

var glp_set_col_name = exports.glp_set_col_name = function(lp, j, name){
    var tree = lp.tree;
    if (tree != null && tree.reason != 0)
        xerror("glp_set_col_name: operation not allowed");
    if (!(1 <= j && j <= lp.n))
        xerror("glp_set_col_name: j = " + j + "; column number out of range");
    var col = lp.col[j];

    if (col.name != null){
        delete(lp.c_tree[col.name]);
        col.name = null;
    }

    if (name != null){
        col.name = name;
        lp.c_tree[col.name] = col;
    }
};

var glp_set_row_bnds = exports.glp_set_row_bnds = function(lp, i, type, lb, ub){
    if (!(1 <= i && i <= lp.m))
        xerror("glp_set_row_bnds: i = " + i + "; row number out of range");
    var row = lp.row[i];
    row.type = type;
    switch (type){
        case GLP_FR:
            row.lb = row.ub = 0.0;
            if (row.stat != GLP_BS) row.stat = GLP_NF;
            break;
        case GLP_LO:
            row.lb = lb; row.ub = 0.0;
            if (row.stat != GLP_BS) row.stat = GLP_NL;
            break;
        case GLP_UP:
            row.lb = 0.0; row.ub = ub;
            if (row.stat != GLP_BS) row.stat = GLP_NU;
            break;
        case GLP_DB:
            row.lb = lb; row.ub = ub;
            if (!(row.stat == GLP_BS ||
                row.stat == GLP_NL || row.stat == GLP_NU))
                row.stat = (Math.abs(lb) <= Math.abs(ub) ? GLP_NL : GLP_NU);
            break;
        case GLP_FX:
            row.lb = row.ub = lb;
            if (row.stat != GLP_BS) row.stat = GLP_NS;
            break;
        default:
            xerror("glp_set_row_bnds: i = " + i + "; type = " + type + "; invalid row type");
    }
};

var glp_set_col_bnds = exports.glp_set_col_bnds = function(lp, j, type, lb, ub){
    if (!(1 <= j && j <= lp.n))
        xerror("glp_set_col_bnds: j = " + j + "; column number out of range");
    var col = lp.col[j];
    col.type = type;
    switch (type){
        case GLP_FR:
            col.lb = col.ub = 0.0;
            if (col.stat != GLP_BS) col.stat = GLP_NF;
            break;
        case GLP_LO:
            col.lb = lb; col.ub = 0.0;
            if (col.stat != GLP_BS) col.stat = GLP_NL;
            break;
        case GLP_UP:
            col.lb = 0.0; col.ub = ub;
            if (col.stat != GLP_BS) col.stat = GLP_NU;
            break;
        case GLP_DB:
            col.lb = lb; col.ub = ub;
            if (!(col.stat == GLP_BS ||
                col.stat == GLP_NL || col.stat == GLP_NU))
                col.stat = (Math.abs(lb) <= Math.abs(ub) ? GLP_NL : GLP_NU);
            break;
        case GLP_FX:
            col.lb = col.ub = lb;
            if (col.stat != GLP_BS) col.stat = GLP_NS;
            break;
        default:
            xerror("glp_set_col_bnds: j = " + j + "; type = " + type + "; invalid column type");
    }
};

var glp_set_obj_coef = exports.glp_set_obj_coef = function(lp, j, coef){
    var tree = lp.tree;
    if (tree != null && tree.reason != 0)
        xerror("glp_set_obj_coef: operation not allowed");
    if (!(0 <= j && j <= lp.n))
        xerror("glp_set_obj_coef: j = " + j + "; column number out of range");
    if (j == 0)
        lp.c0 = coef;
    else
        lp.col[j].coef = coef;
};

var glp_set_mat_row = exports.glp_set_mat_row = function(lp, i, len, ind, val){
    var tree = lp.tree;
    var col, aij, next, j, k;
    /* obtain pointer to i-th row */
    if (!(1 <= i && i <= lp.m))
        xerror("glp_set_mat_row: i = " + i + "; row number out of range");
    var row = lp.row[i];
    if (tree != null && tree.reason != 0){
        xassert(tree.curr != null);
        xassert(row.level == tree.curr.level);
    }
    /* remove all existing elements from i-th row */
    while (row.ptr != null){
        /* take next element in the row */
        aij = row.ptr;
        /* remove the element from the row list */
        row.ptr = aij.r_next;
        /* obtain pointer to corresponding column */
        col = aij.col;
        /* remove the element from the column list */
        if (aij.c_prev == null)
            col.ptr = aij.c_next;
        else
            aij.c_prev.c_next = aij.c_next;
        if (aij.c_next != null)
            aij.c_next.c_prev = aij.c_prev;
        /* return the element to the memory pool */
        lp.nnz--;
        /* if the corresponding column is basic, invalidate the basis
         factorization */
        if (col.stat == GLP_BS) lp.valid = 0;
    }
    /* store new contents of i-th row */
    if (!(0 <= len && len <= lp.n))
        xerror("glp_set_mat_row: i = " + i + "; len = " + len + "; invalid row length ");
    if (len > NNZ_MAX - lp.nnz)
        xerror("glp_set_mat_row: i = " + i + "; len = " + len + "; too many constraint coefficients");
    for (k = 1; k <= len; k++){
        /* take number j of corresponding column */
        j = ind[k];
        /* obtain pointer to j-th column */
        if (!(1 <= j && j <= lp.n))
            xerror("glp_set_mat_row: i = " + i + "; ind[" + k + "] = " + j + "; column index out of range");
        col = lp.col[j];
        /* if there is element with the same column index, it can only
         be found in the beginning of j-th column list */
        if (col.ptr != null && col.ptr.row.i == i)
            xerror("glp_set_mat_row: i = " + i + "; ind[" + k + "] = " + j + "; duplicate column indices not allowed");
        /* create new element */
        aij = {}; lp.nnz++;
        aij.row = row;
        aij.col = col;
        aij.val = val[k];
        /* add the new element to the beginning of i-th row and j-th
         column lists */
        aij.r_prev = null;
        aij.r_next = row.ptr;
        aij.c_prev = null;
        aij.c_next = col.ptr;
        if (aij.r_next != null) aij.r_next.r_prev = aij;
        if (aij.c_next != null) aij.c_next.c_prev = aij;
        row.ptr = col.ptr = aij;
        /* if the corresponding column is basic, invalidate the basis
         factorization */
        if (col.stat == GLP_BS && aij.val != 0.0) lp.valid = 0;
    }
    /* remove zero elements from i-th row */
    for (aij = row.ptr; aij != null; aij = next)
    {  next = aij.r_next;
        if (aij.val == 0.0)
        {  /* remove the element from the row list */
            if (aij.r_prev == null)
                row.ptr = next;
            else
                aij.r_prev.r_next = next;
            if (next != null)
                next.r_prev = aij.r_prev;
            /* remove the element from the column list */
            xassert(aij.c_prev == null);
            aij.col.ptr = aij.c_next;
            if (aij.c_next != null) aij.c_next.c_prev = null;
            /* return the element to the memory pool */
            lp.nnz--;
        }
    }
};

var glp_set_mat_col = exports.glp_set_mat_col = function(lp, j, len, ind, val){
    var tree = lp.tree;
    var row, aij, next;
    var i, k;
    if (tree != null && tree.reason != 0)
        xerror("glp_set_mat_col: operation not allowed");
    /* obtain pointer to j-th column */
    if (!(1 <= j && j <= lp.n))
        xerror("glp_set_mat_col: j = " + j + "; column number out of range");
    var col = lp.col[j];
    /* remove all existing elements from j-th column */
    while (col.ptr != null)
    {  /* take next element in the column */
        aij = col.ptr;
        /* remove the element from the column list */
        col.ptr = aij.c_next;
        /* obtain pointer to corresponding row */
        row = aij.row;
        /* remove the element from the row list */
        if (aij.r_prev == null)
            row.ptr = aij.r_next;
        else
            aij.r_prev.r_next = aij.r_next;
        if (aij.r_next != null)
            aij.r_next.r_prev = aij.r_prev;
        /* return the element to the memory pool */
        lp.nnz--;
    }
    /* store new contents of j-th column */
    if (!(0 <= len && len <= lp.m))
        xerror("glp_set_mat_col: j = " + j + "; len = " + len + "; invalid column length");
    if (len > NNZ_MAX - lp.nnz)
        xerror("glp_set_mat_col: j = " + j + "; len = " + len + "; too many constraint coefficients");
    for (k = 1; k <= len; k++){
        /* take number i of corresponding row */
        i = ind[k];
        /* obtain pointer to i-th row */
        if (!(1 <= i && i <= lp.m))
            xerror("glp_set_mat_col: j = " + j + "; ind[" + k + "] = " + i + "; row index out of range");
        row = lp.row[i];
        /* if there is element with the same row index, it can only be
         found in the beginning of i-th row list */
        if (row.ptr != null && row.ptr.col.j == j)
            xerror("glp_set_mat_col: j = " + j + "; ind[" + k + "] = " + i + "; duplicate row indices not allowed");
        /* create new element */
        aij = {}; lp.nnz++;
        aij.row = row;
        aij.col = col;
        aij.val = val[k];
        /* add the new element to the beginning of i-th row and j-th
         column lists */
        aij.r_prev = null;
        aij.r_next = row.ptr;
        aij.c_prev = null;
        aij.c_next = col.ptr;
        if (aij.r_next != null) aij.r_next.r_prev = aij;
        if (aij.c_next != null) aij.c_next.c_prev = aij;
        row.ptr = col.ptr = aij;
    }
    /* remove zero elements from j-th column */
    for (aij = col.ptr; aij != null; aij = next)
    {  next = aij.c_next;
        if (aij.val == 0.0)
        {  /* remove the element from the row list */
            xassert(aij.r_prev == null);
            aij.row.ptr = aij.r_next;
            if (aij.r_next != null) aij.r_next.r_prev = null;
            /* remove the element from the column list */
            if (aij.c_prev == null)
                col.ptr = next;
            else
                aij.c_prev.c_next = next;
            if (next != null)
                next.c_prev = aij.c_prev;
            /* return the element to the memory pool */
            lp.nnz--;
        }
    }
    /* if j-th column is basic, invalidate the basis factorization */
    if (col.stat == GLP_BS) lp.valid = 0;
};

var glp_load_matrix = exports.glp_load_matrix = function(lp, ne, ia, ja, ar){
    var tree = lp.tree;
    var row, col, aij, next;
    var i, j, k;
    if (tree != null && tree.reason != 0)
        xerror("glp_load_matrix: operation not allowed");
    /* clear the constraint matrix */
    for (i = 1; i <= lp.m; i++){
        row = lp.row[i];
        while (row.ptr != null){
            aij = row.ptr;
            row.ptr = aij.r_next;
            lp.nnz--;
        }
    }
    xassert(lp.nnz == 0);
    for (j = 1; j <= lp.n; j++) lp.col[j].ptr = null;
    /* load the new contents of the constraint matrix and build its
     row lists */
    if (ne < 0)
        xerror("glp_load_matrix: ne = " + ne + "; invalid number of constraint coefficients");
    if (ne > NNZ_MAX)
        xerror("glp_load_matrix: ne = " + ne + "; too many constraint coefficients");
    for (k = 1; k <= ne; k++){
        /* take indices of new element */
        i = ia[k]; j = ja[k];
        /* obtain pointer to i-th row */
        if (!(1 <= i && i <= lp.m))
            xerror("glp_load_matrix: ia[" + k + "] = " + i + "; row index out of range");
        row = lp.row[i];
        /* obtain pointer to j-th column */
        if (!(1 <= j && j <= lp.n))
            xerror("glp_load_matrix: ja[" + k + "] = " + j + "; column index out of range");
        col = lp.col[j];
        /* create new element */
        aij = {}; lp.nnz++;
        aij.row = row;
        aij.col = col;
        aij.val = ar[k];
        /* add the new element to the beginning of i-th row list */
        aij.r_prev = null;
        aij.r_next = row.ptr;
        if (aij.r_next != null) aij.r_next.r_prev = aij;
        row.ptr = aij;
    }
    xassert(lp.nnz == ne);
    /* build column lists of the constraint matrix and check elements
     with identical indices */
    for (i = 1; i <= lp.m; i++){
        for (aij = lp.row[i].ptr; aij != null; aij = aij.r_next){
            /* obtain pointer to corresponding column */
            col = aij.col;
            /* if there is element with identical indices, it can only
             be found in the beginning of j-th column list */
            if (col.ptr != null && col.ptr.row.i == i){
                for (k = 1; k <= ne; k++)
                    if (ia[k] == i && ja[k] == col.j) break;
                xerror("glp_load_mat: ia[" + k + "] = " + i + "; ja[" + k + "] = " + col.j + "; duplicate indices not allowed");
            }
            /* add the element to the beginning of j-th column list */
            aij.c_prev = null;
            aij.c_next = col.ptr;
            if (aij.c_next != null) aij.c_next.c_prev = aij;
            col.ptr = aij;
        }
    }
    /* remove zero elements from the constraint matrix */
    for (i = 1; i <= lp.m; i++)
    {  row = lp.row[i];
        for (aij = row.ptr; aij != null; aij = next)
        {  next = aij.r_next;
            if (aij.val == 0.0)
            {  /* remove the element from the row list */
                if (aij.r_prev == null)
                    row.ptr = next;
                else
                    aij.r_prev.r_next = next;
                if (next != null)
                    next.r_prev = aij.r_prev;
                /* remove the element from the column list */
                if (aij.c_prev == null)
                    aij.col.ptr = aij.c_next;
                else
                    aij.c_prev.c_next = aij.c_next;
                if (aij.c_next != null)
                    aij.c_next.c_prev = aij.c_prev;
                /* return the element to the memory pool */
                lp.nnz--;
            }
        }
    }
    /* invalidate the basis factorization */
    lp.valid = 0;
};

var glp_check_dup = exports.glp_check_dup = function(m, n, ne, ia, ja){
    var i, j, k, ptr, next, ret;
    var flag;
    if (m < 0)
        xerror("glp_check_dup: m = %d; invalid parameter");
    if (n < 0)
        xerror("glp_check_dup: n = %d; invalid parameter");
    if (ne < 0)
        xerror("glp_check_dup: ne = %d; invalid parameter");
    if (ne > 0 && ia == null)
        xerror("glp_check_dup: ia = " + ia + "; invalid parameter");
    if (ne > 0 && ja == null)
        xerror("glp_check_dup: ja = " + ja + "; invalid parameter");
    for (k = 1; k <= ne; k++){
        i = ia[k]; j = ja[k];
        if (!(1 <= i && i <= m && 1 <= j && j <= n)){
            ret = -k;
            return ret;
        }
    }
    if (m == 0 || n == 0)
    {  ret = 0;
        return ret;
    }
    /* allocate working arrays */
    ptr = new Array(1+m);
    next = new Array(1+ne);
    flag = new Array(1+n);
    /* build row lists */
    for (i = 1; i <= m; i++)
        ptr[i] = 0;
    for (k = 1; k <= ne; k++){
        i = ia[k];
        next[k] = ptr[i];
        ptr[i] = k;
    }
    /* clear column flags */
    for (j = 1; j <= n; j++)
        flag[j] = 0;
    /* check for duplicate elements */
    for (i = 1; i <= m; i++){
        for (k = ptr[i]; k != 0; k = next[k]){
            j = ja[k];
            if (flag[j]){
                /* find first element (i,j) */
                for (k = 1; k <= ne; k++)
                    if (ia[k] == i && ja[k] == j) break;
                xassert(k <= ne);
                /* find next (duplicate) element (i,j) */
                for (k++; k <= ne; k++)
                    if (ia[k] == i && ja[k] == j) break;
                xassert(k <= ne);
                ret = +k;
                return ret;
            }
            flag[j] = 1;
        }
        /* clear column flags */
        for (k = ptr[i]; k != 0; k = next[k])
            flag[ja[k]] = 0;
    }
    /* no duplicate element found */
    ret = 0;
    return ret;
};

var glp_sort_matrix = exports.glp_sort_matrix = function(P){
    var aij;
    var i, j;
    if (P == null || P.magic != GLP_PROB_MAGIC)
        xerror("glp_sort_matrix: P = " + P + "; invalid problem object");
    /* rebuild row linked lists */
    for (i = P.m; i >= 1; i--)
        P.row[i].ptr = null;
    for (j = P.n; j >= 1; j--){
        for (aij = P.col[j].ptr; aij != null; aij = aij.c_next){
            i = aij.row.i;
            aij.r_prev = null;
            aij.r_next = P.row[i].ptr;
            if (aij.r_next != null) aij.r_next.r_prev = aij;
            P.row[i].ptr = aij;
        }
    }
    /* rebuild column linked lists */
    for (j = P.n; j >= 1; j--)
        P.col[j].ptr = null;
    for (i = P.m; i >= 1; i--){
        for (aij = P.row[i].ptr; aij != null; aij = aij.r_next){
            j = aij.col.j;
            aij.c_prev = null;
            aij.c_next = P.col[j].ptr;
            if (aij.c_next != null) aij.c_next.c_prev = aij;
            P.col[j].ptr = aij;
        }
    }
};

var glp_del_rows = exports.glp_del_rows = function(lp, nrs, num){
    var tree = lp.tree;
    var row;
    var i, k, m_new;
    /* mark rows to be deleted */
    if (!(1 <= nrs && nrs <= lp.m))
        xerror("glp_del_rows: nrs = " + nrs + "; invalid number of rows");
    for (k = 1; k <= nrs; k++){
        /* take the number of row to be deleted */
        i = num[k];
        /* obtain pointer to i-th row */
        if (!(1 <= i && i <= lp.m))
            xerror("glp_del_rows: num[" + k + "] = " + i + "; row number out of range");
        row = lp.row[i];
        if (tree != null && tree.reason != 0){
            if (!(tree.reason == GLP_IROWGEN || tree.reason == GLP_ICUTGEN))
                xerror("glp_del_rows: operation not allowed");
            xassert(tree.curr != null);
            if (row.level != tree.curr.level)
                xerror("glp_del_rows: num[" + k + "] = " + i + "; invalid attempt to delete row created not in current subproblem");
            if (row.stat != GLP_BS)
                xerror("glp_del_rows: num[" + k + "] = " + i + "; invalid attempt to delete active row (constraint)");
            tree.reinv = 1;
        }
        /* check that the row is not marked yet */
        if (row.i == 0)
            xerror("glp_del_rows: num[" + k + "] = " + i + "; duplicate row numbers not allowed");
        /* erase symbolic name assigned to the row */
        glp_set_row_name(lp, i, null);
        xassert(row.node == null);
        /* erase corresponding row of the constraint matrix */
        glp_set_mat_row(lp, i, 0, null, null);
        xassert(row.ptr == null);
        /* mark the row to be deleted */
        row.i = 0;
    }
    /* delete all marked rows from the row list */
    m_new = 0;
    for (i = 1; i <= lp.m; i++){
        /* obtain pointer to i-th row */
        row = lp.row[i];
        /* check if the row is marked */
        if (row.i != 0){
            /* it is not marked; keep it */
            row.i = ++m_new;
            lp.row[row.i] = row;
        }
    }
    /* set new number of rows */
    lp.m = m_new;
    /* invalidate the basis factorization */
    lp.valid = 0;
};

var glp_del_cols = exports.glp_del_cols = function(lp, ncs, num){
    var tree = lp.tree;
    var col;
    var j, k, n_new;
    if (tree != null && tree.reason != 0)
        xerror("glp_del_cols: operation not allowed");
    /* mark columns to be deleted */
    if (!(1 <= ncs && ncs <= lp.n))
        xerror("glp_del_cols: ncs = " + ncs + "; invalid number of columns");
    for (k = 1; k <= ncs; k++){
        /* take the number of column to be deleted */
        j = num[k];
        /* obtain pointer to j-th column */
        if (!(1 <= j && j <= lp.n))
            xerror("glp_del_cols: num[" + k + "] = " + j + "; column number out of range");
        col = lp.col[j];
        /* check that the column is not marked yet */
        if (col.j == 0)
            xerror("glp_del_cols: num[" + k + "] = " + j + "; duplicate column numbers not allowed");
        /* erase symbolic name assigned to the column */
        glp_set_col_name(lp, j, null);
        xassert(col.node == null);
        /* erase corresponding column of the constraint matrix */
        glp_set_mat_col(lp, j, 0, null, null);
        xassert(col.ptr == null);
        /* mark the column to be deleted */
        col.j = 0;
        /* if it is basic, invalidate the basis factorization */
        if (col.stat == GLP_BS) lp.valid = 0;
    }
    /* delete all marked columns from the column list */
    n_new = 0;
    for (j = 1; j <= lp.n; j++)
    {  /* obtain pointer to j-th column */
        col = lp.col[j];
        /* check if the column is marked */
        if (col.j != 0){
            /* it is not marked; keep it */
            col.j = ++n_new;
            lp.col[col.j] = col;
        }
    }
    /* set new number of columns */
    lp.n = n_new;
    /* if the basis header is still valid, adjust it */
    if (lp.valid){
        var m = lp.m;
        var head = lp.head;
        for (j = 1; j <= n_new; j++){
            k = lp.col[j].bind;
            if (k != 0){
                xassert(1 <= k && k <= m);
                head[k] = m + j;
            }
        }
    }
};

var glp_copy_prob = exports.glp_copy_prob = function(dest, prob, names){
    var tree = dest.tree;
    var bfcp = {};
    var i, j, len, ind;
    var val;
    if (tree != null && tree.reason != 0)
        xerror("glp_copy_prob: operation not allowed");
    if (dest == prob)
        xerror("glp_copy_prob: copying problem object to itself not allowed");
    if (!(names == GLP_ON || names == GLP_OFF))
        xerror("glp_copy_prob: names = " + names + "; invalid parameter");
    glp_erase_prob(dest);
    if (names && prob.name != null)
        glp_set_prob_name(dest, prob.name);
    if (names && prob.obj != null)
        glp_set_obj_name(dest, prob.obj);
    dest.dir = prob.dir;
    dest.c0 = prob.c0;
    if (prob.m > 0)
        glp_add_rows(dest, prob.m);
    if (prob.n > 0)
        glp_add_cols(dest, prob.n);
    glp_get_bfcp(prob, bfcp);
    glp_set_bfcp(dest, bfcp);
    dest.pbs_stat = prob.pbs_stat;
    dest.dbs_stat = prob.dbs_stat;
    dest.obj_val = prob.obj_val;
    dest.some = prob.some;
    dest.ipt_stat = prob.ipt_stat;
    dest.ipt_obj = prob.ipt_obj;
    dest.mip_stat = prob.mip_stat;
    dest.mip_obj = prob.mip_obj;
    var to, from;
    for (i = 1; i <= prob.m; i++){
        to = dest.row[i];
        from = prob.row[i];
        if (names && from.name != null)
            glp_set_row_name(dest, i, from.name);
        to.type = from.type;
        to.lb = from.lb;
        to.ub = from.ub;
        to.rii = from.rii;
        to.stat = from.stat;
        to.prim = from.prim;
        to.dual = from.dual;
        to.pval = from.pval;
        to.dval = from.dval;
        to.mipx = from.mipx;
    }
    ind = new Array(1+prob.m);
    val = new Array(1+prob.m);
    for (j = 1; j <= prob.n; j++){
        to = dest.col[j];
        from = prob.col[j];
        if (names && from.name != null)
            glp_set_col_name(dest, j, from.name);
        to.kind = from.kind;
        to.type = from.type;
        to.lb = from.lb;
        to.ub = from.ub;
        to.coef = from.coef;
        len = glp_get_mat_col(prob, j, ind, val);
        glp_set_mat_col(dest, j, len, ind, val);
        to.sjj = from.sjj;
        to.stat = from.stat;
        to.prim = from.prim;
        to.dual = from.dual;
        to.pval = from.pval;
        to.dval = from.dval;
        to.mipx = from.mipx;
    }
};

var glp_erase_prob = exports.glp_erase_prob = function(lp){
    var tree = lp.tree;
    if (tree != null && tree.reason != 0)
        xerror("glp_erase_prob: operation not allowed");
    delete_prob(lp);
    create_prob(lp);
};

function delete_prob(lp){
    lp.magic = 0x3F3F3F3F;
    lp.parms = null;
    xassert(lp.tree == null);
    lp.row = null;
    lp.col = null;
    lp.r_tree = null;
    lp.c_tree = null;
    lp.head = null;
    lp.bfcp = null;
    lp.bfd = null;
}

var glp_delete_prob = exports.glp_delete_prob = function (lp){
    var tree = lp.tree;
    if (tree != null && tree.reason != 0)
        xerror("glp_delete_prob: operation not allowed");
    delete_prob(lp);
};

var glp_get_prob_name = exports.glp_get_prob_name = function(lp){
    return lp.name;
};

var glp_get_obj_name = exports.glp_get_obj_name = function(lp){
    return lp.obj;
};

var glp_get_obj_dir = exports.glp_get_obj_dir = function(lp){
    return lp.dir;
};

var glp_get_num_rows = exports.glp_get_num_rows = function(lp){
    return lp.m;
};

var glp_get_num_cols = exports.glp_get_num_cols = function(lp){
    return lp.n;
};

var glp_get_row_name = exports.glp_get_row_name = function(lp, i){
    if (!(1 <= i && i <= lp.m))
        xerror("glp_get_row_name: i = " + i + "; row number out of range");
    return lp.row[i].name;
};

var glp_get_col_name = exports.glp_get_col_name = function(lp, j){
    if (!(1 <= j && j <= lp.n))
        xerror("glp_get_col_name: j = " + j + "; column number out of range");
    return lp.col[j].name;
};

var glp_get_row_type = exports.glp_get_row_type = function(lp, i){
    if (!(1 <= i && i <= lp.m))
        xerror("glp_get_row_type: i = " + i + "; row number out of range");
    return lp.row[i].type;
};

var glp_get_row_lb = exports.glp_get_row_lb = function(lp, i){
    var lb;
    if (!(1 <= i && i <= lp.m))
        xerror("glp_get_row_lb: i = " + i + "; row number out of range");
    switch (lp.row[i].type){
        case GLP_FR:
        case GLP_UP:
            lb = -DBL_MAX; break;
        case GLP_LO:
        case GLP_DB:
        case GLP_FX:
            lb = lp.row[i].lb; break;
        default:
            xassert(lp != lp);
    }
    return lb;
};

var glp_get_row_ub = exports.glp_get_row_ub = function(lp, i){
    var ub;
    if (!(1 <= i && i <= lp.m))
        xerror("glp_get_row_ub: i = " + i + "; row number out of range");
    switch (lp.row[i].type){
        case GLP_FR:
        case GLP_LO:
            ub = +DBL_MAX; break;
        case GLP_UP:
        case GLP_DB:
        case GLP_FX:
            ub = lp.row[i].ub; break;
        default:
            xassert(lp != lp);
    }
    return ub;
};

var glp_get_col_type = exports.glp_get_col_type = function(lp, j)
{     if (!(1 <= j && j <= lp.n))
    xerror("glp_get_col_type: j = " + j + "; column number out of range");
    return lp.col[j].type;
};

var glp_get_col_lb = exports.glp_get_col_lb = function(lp, j){
    var lb;
    if (!(1 <= j && j <= lp.n))
        xerror("glp_get_col_lb: j = " + j + "; column number out of range");
    switch (lp.col[j].type){
        case GLP_FR:
        case GLP_UP:
            lb = -DBL_MAX; break;
        case GLP_LO:
        case GLP_DB:
        case GLP_FX:
            lb = lp.col[j].lb; break;
        default:
            xassert(lp != lp);
    }
    return lb;
};

var glp_get_col_ub = exports.glp_get_col_ub = function(lp, j){
    var ub;
    if (!(1 <= j && j <= lp.n))
        xerror("glp_get_col_ub: j = " + j + "; column number out of range");
    switch (lp.col[j].type){
        case GLP_FR:
        case GLP_LO:
            ub = +DBL_MAX; break;
        case GLP_UP:
        case GLP_DB:
        case GLP_FX:
            ub = lp.col[j].ub; break;
        default:
            xassert(lp != lp);
    }
    return ub;
};

var glp_get_obj_coef = exports.glp_get_obj_coef = function(lp, j){
    if (!(0 <= j && j <= lp.n))
        xerror("glp_get_obj_coef: j = " + j + "; column number out of range");
    return j == 0 ? lp.c0 : lp.col[j].coef;
};

var glp_get_num_nz = exports.glp_get_num_nz = function (lp){
    return lp.nnz;
};

var glp_get_mat_row = exports.glp_get_mat_row = function(lp, i, ind, val){
    var aij;
    var len;
    if (!(1 <= i && i <= lp.m))
        xerror("glp_get_mat_row: i = " + i + "; row number out of range");
    len = 0;
    for (aij = lp.row[i].ptr; aij != null; aij = aij.r_next){
        len++;
        if (ind != null) ind[len] = aij.col.j;
        if (val != null) val[len] = aij.val;
    }
    xassert(len <= lp.n);
    return len;
};

var glp_get_mat_col = exports.glp_get_mat_col = function(lp, j, ind, val){
    var aij;
    var len;
    if (!(1 <= j && j <= lp.n))
        xerror("glp_get_mat_col: j = " + j + "; column number out of range");
    len = 0;
    for (aij = lp.col[j].ptr; aij != null; aij = aij.c_next){
        len++;
        if (ind != null) ind[len] = aij.row.i;
        if (val != null) val[len] = aij.val;
    }
    xassert(len <= lp.m);
    return len;
};

var glp_create_index = exports.glp_create_index = function(lp){
    var row;
    var col;
    var i, j;
    /* create row name index */
    if (lp.r_tree == null){
        lp.r_tree = {};
        for (i = 1; i <= lp.m; i++){
            row = lp.row[i];
            if (row.name != null){
                lp.r_tree[row.name] = row;
            }
        }
    }
    /* create column name index */
    if (lp.c_tree == null)
    {  lp.c_tree = {};
        for (j = 1; j <= lp.n; j++){
            col = lp.col[j];
            if (col.name != null){
                lp.c_tree[col.name] = col;
            }
        }
    }
};

var glp_find_row = exports.glp_find_row = function(lp, name){
    var i = 0;
    if (lp.r_tree == null)
        xerror("glp_find_row: row name index does not exist");
    var row = lp.r_tree[name];
    if (row) i = row.i;
    return i;
};

var glp_find_col = exports.glp_find_col = function(lp, name){
    var j = 0;
    if (lp.c_tree == null)
        xerror("glp_find_col: column name index does not exist");
    var col = lp.c_tree[name];
    if (col) j = col.j;
    return j;
};

var glp_delete_index = exports.glp_delete_index = function(lp){
    lp.r_tree = null;
    lp.r_tree = null;
};
var glp_set_rii = exports.glp_set_rii = function(lp, i, rii){
    if (!(1 <= i && i <= lp.m))
        xerror("glp_set_rii: i = " + i + "; row number out of range");
    if (rii <= 0.0)
        xerror("glp_set_rii: i = " + i + "; rii = " + rii + "; invalid scale factor");
    if (lp.valid && lp.row[i].rii != rii){
        for (var aij = lp.row[i].ptr; aij != null; aij = aij.r_next){
            if (aij.col.stat == GLP_BS){
                /* invalidate the basis factorization */
                lp.valid = 0;
                break;
            }
        }
    }
    lp.row[i].rii = rii;
};

var glp_set_sjj = exports.glp_set_sjj = function(lp, j, sjj){
    if (!(1 <= j && j <= lp.n))
        xerror("glp_set_sjj: j = " + j + "; column number out of range");
    if (sjj <= 0.0)
        xerror("glp_set_sjj: j = " + j + "; sjj = " + sjj + "; invalid scale factor");
    if (lp.valid && lp.col[j].sjj != sjj && lp.col[j].stat == GLP_BS){
        /* invalidate the basis factorization */
        lp.valid = 0;
    }
    lp.col[j].sjj = sjj;
};

var glp_get_rii = exports.glp_get_rii = function(lp, i){
    if (!(1 <= i && i <= lp.m))
        xerror("glp_get_rii: i = " + i + "; row number out of range");
    return lp.row[i].rii;
};

var glp_get_sjj = exports.glp_get_sjj = function(lp, j){
    if (!(1 <= j && j <= lp.n))
        xerror("glp_get_sjj: j = " + j + "; column number out of range");
    return lp.col[j].sjj;
};

var glp_unscale_prob = exports.glp_unscale_prob = function(lp){
    var m = glp_get_num_rows(lp);
    var n = glp_get_num_cols(lp);
    var i, j;
    for (i = 1; i <= m; i++) glp_set_rii(lp, i, 1.0);
    for (j = 1; j <= n; j++) glp_set_sjj(lp, j, 1.0);
};
var glp_set_row_stat = exports.glp_set_row_stat = function(lp, i, stat){
    var row;
    if (!(1 <= i && i <= lp.m))
        xerror("glp_set_row_stat: i = " + i + "; row number out of range");
    if (!(stat == GLP_BS || stat == GLP_NL || stat == GLP_NU || stat == GLP_NF || stat == GLP_NS))
        xerror("glp_set_row_stat: i = " + i + "; stat = " + stat + "; invalid status");
    row = lp.row[i];
    if (stat != GLP_BS){
        switch (row.type){
            case GLP_FR: stat = GLP_NF; break;
            case GLP_LO: stat = GLP_NL; break;
            case GLP_UP: stat = GLP_NU; break;
            case GLP_DB: if (stat != GLP_NU) stat = GLP_NL; break;
            case GLP_FX: stat = GLP_NS; break;
            default: xassert(row != row);
        }
    }
    if (row.stat == GLP_BS && stat != GLP_BS || row.stat != GLP_BS && stat == GLP_BS){
        /* invalidate the basis factorization */
        lp.valid = 0;
    }
    row.stat = stat;
};

var glp_set_col_stat = exports.glp_set_col_stat = function(lp, j, stat){
    var col;
    if (!(1 <= j && j <= lp.n))
        xerror("glp_set_col_stat: j = " + j + "; column number out of range");
    if (!(stat == GLP_BS || stat == GLP_NL || stat == GLP_NU || stat == GLP_NF || stat == GLP_NS))
        xerror("glp_set_col_stat: j = " + j + "; stat = " + stat + "; invalid status");
    col = lp.col[j];
    if (stat != GLP_BS){
        switch (col.type){
            case GLP_FR: stat = GLP_NF; break;
            case GLP_LO: stat = GLP_NL; break;
            case GLP_UP: stat = GLP_NU; break;
            case GLP_DB: if (stat != GLP_NU) stat = GLP_NL; break;
            case GLP_FX: stat = GLP_NS; break;
            default: xassert(col != col);
        }
    }
    if (col.stat == GLP_BS && stat != GLP_BS || col.stat != GLP_BS && stat == GLP_BS){
        /* invalidate the basis factorization */
        lp.valid = 0;
    }
    col.stat = stat;
};

var glp_std_basis = exports.glp_std_basis = function(lp){
    var i, j;
    /* make all auxiliary variables basic */
    for (i = 1; i <= lp.m; i++)
        glp_set_row_stat(lp, i, GLP_BS);
    /* make all structural variables non-basic */
    for (j = 1; j <= lp.n; j++){
        var col = lp.col[j];
        if (col.type == GLP_DB && Math.abs(col.lb) > Math.abs(col.ub))
            glp_set_col_stat(lp, j, GLP_NU);
        else
            glp_set_col_stat(lp, j, GLP_NL);
    }
};

var glp_simplex = exports.glp_simplex = function(P, parm){

    function solve_lp(P, parm){
        /* solve LP directly without using the preprocessor */
        var ret;
        if (!glp_bf_exists(P)){
            ret = glp_factorize(P);
            if (ret == 0){

            }
            else if (ret == GLP_EBADB){
                if (parm.msg_lev >= GLP_MSG_ERR)
                    xprintf("glp_simplex: initial basis is invalid");
            }
            else if (ret == GLP_ESING){
                if (parm.msg_lev >= GLP_MSG_ERR)
                    xprintf("glp_simplex: initial basis is singular");
            }
            else if (ret == GLP_ECOND){
                if (parm.msg_lev >= GLP_MSG_ERR)
                    xprintf("glp_simplex: initial basis is ill-conditioned");
            }
            else
                xassert(ret != ret);
            if (ret != 0) return ret;
        }
        if (parm.meth == GLP_PRIMAL)
            ret = spx_primal(P, parm);
        else if (parm.meth == GLP_DUALP)
        {  ret = spx_dual(P, parm);
            if (ret == GLP_EFAIL && P.valid)
                ret = spx_primal(P, parm);
        }
        else if (parm.meth == GLP_DUAL)
            ret = spx_dual(P, parm);
        else
            xassert(parm != parm);
        return ret;
    }

    function preprocess_and_solve_lp(P, parm){
        /* solve LP using the preprocessor */
        var npp;
        var lp = null;
        var bfcp = {};
        var ret;

        function done(){
            /* delete the transformed LP, if it exists */
            if (lp != null) glp_delete_prob(lp);
            return ret;
        }

        function post(){
            /* postprocess solution from the transformed LP */
            npp_postprocess(npp, lp);
            /* the transformed LP is no longer needed */
            glp_delete_prob(lp);
            lp = null;
            /* store solution to the original problem */
            npp_unload_sol(npp, P);
            /* the original LP has been successfully solved */
            ret = 0;
            return done()
        }


        if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("Preprocessing...");
        /* create preprocessor workspace */
        npp = npp_create_wksp();
        /* load original problem into the preprocessor workspace */
        npp_load_prob(npp, P, GLP_OFF, GLP_SOL, GLP_OFF);
        /* process LP prior to applying primal/dual simplex method */
        ret = npp_simplex(npp, parm);
        if (ret == 0)
        {

        }
        else if (ret == GLP_ENOPFS)
        {  if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("PROBLEM HAS NO PRIMAL FEASIBLE SOLUTION");
        }
        else if (ret == GLP_ENODFS)
        {  if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("PROBLEM HAS NO DUAL FEASIBLE SOLUTION");
        }
        else
            xassert(ret != ret);
        if (ret != 0) return done();
        /* build transformed LP */
        lp = glp_create_prob();
        npp_build_prob(npp, lp);
        /* if the transformed LP is empty, it has empty solution, which
         is optimal */
        if (lp.m == 0 && lp.n == 0)
        {  lp.pbs_stat = lp.dbs_stat = GLP_FEAS;
            lp.obj_val = lp.c0;
            if (parm.msg_lev >= GLP_MSG_ON && parm.out_dly == 0)
            {  xprintf(P.it_cnt + ": obj = " + lp.obj_val + "  infeas = 0.0");
            }
            if (parm.msg_lev >= GLP_MSG_ALL)
                xprintf("OPTIMAL SOLUTION FOUND BY LP PREPROCESSOR");
            return post();
        }
        if (parm.msg_lev >= GLP_MSG_ALL)
        {  xprintf(lp.m + " row" + (lp.m == 1 ? "" : "s") + ", " + lp.n + " column" + (lp.n == 1 ? "" : "s") + ", "
            + lp.nnz + " non-zero" + (lp.nnz == 1 ? "" : "s") + "");
        }
        /* inherit basis factorization control parameters */
        glp_get_bfcp(P, bfcp);
        glp_set_bfcp(lp, bfcp);
        /* scale the transformed problem */

        {   var env = get_env_ptr();
            var term_out = env.term_out;
            if (!term_out || parm.msg_lev < GLP_MSG_ALL)
                env.term_out = GLP_OFF;
            else
                env.term_out = GLP_ON;
            glp_scale_prob(lp, GLP_SF_AUTO);
            env.term_out = term_out;
        }
        /* build advanced initial basis */
        {   env = get_env_ptr();
            term_out = env.term_out;
            if (!term_out || parm.msg_lev < GLP_MSG_ALL)
                env.term_out = GLP_OFF;
            else
                env.term_out = GLP_ON;
            glp_adv_basis(lp, 0);
            env.term_out = term_out;
        }
        /* solve the transformed LP */
        lp.it_cnt = P.it_cnt;
        ret = solve_lp(lp, parm);
        P.it_cnt = lp.it_cnt;
        /* only optimal solution can be postprocessed */
        if (!(ret == 0 && lp.pbs_stat == GLP_FEAS && lp.dbs_stat == GLP_FEAS)){
            if (parm.msg_lev >= GLP_MSG_ERR)
                xprintf("glp_simplex: unable to recover undefined or non-optimal solution");
            if (ret == 0){
                if (lp.pbs_stat == GLP_NOFEAS)
                    ret = GLP_ENOPFS;
                else if (lp.dbs_stat == GLP_NOFEAS)
                    ret = GLP_ENODFS;
                else
                    xassert(lp != lp);
            }
            return done();
        }
        return post();
    }

    function trivial_lp(P, parm){
        /* solve trivial LP which has empty constraint matrix */
        var row, col;
        var i, j;
        var p_infeas, d_infeas, zeta;
        P.valid = 0;
        P.pbs_stat = P.dbs_stat = GLP_FEAS;
        P.obj_val = P.c0;
        P.some = 0;
        p_infeas = d_infeas = 0.0;
        /* make all auxiliary variables basic */
        for (i = 1; i <= P.m; i++){
            row = P.row[i];
            row.stat = GLP_BS;
            row.prim = row.dual = 0.0;
            /* check primal feasibility */
            if (row.type == GLP_LO || row.type == GLP_DB || row.type == GLP_FX){
                /* row has lower bound */
                if (row.lb > + parm.tol_bnd){
                    P.pbs_stat = GLP_NOFEAS;
                    if (P.some == 0 && parm.meth != GLP_PRIMAL)
                        P.some = i;
                }
                if (p_infeas < + row.lb)
                    p_infeas = + row.lb;
            }
            if (row.type == GLP_UP || row.type == GLP_DB || row.type == GLP_FX){
                /* row has upper bound */
                if (row.ub < - parm.tol_bnd){
                    P.pbs_stat = GLP_NOFEAS;
                    if (P.some == 0 && parm.meth != GLP_PRIMAL)
                        P.some = i;
                }
                if (p_infeas < - row.ub)
                    p_infeas = - row.ub;
            }
        }
        /* determine scale factor for the objective row */
        zeta = 1.0;
        for (j = 1; j <= P.n; j++)
        {  col = P.col[j];
            if (zeta < Math.abs(col.coef)) zeta = Math.abs(col.coef);
        }
        zeta = (P.dir == GLP_MIN ? +1.0 : -1.0) / zeta;
        /* make all structural variables non-basic */

        function lo(){col.stat = GLP_NL; col.prim = col.lb}
        function up(){col.stat = GLP_NU; col.prim = col.ub}

        for (j = 1; j <= P.n; j++)
        {  col = P.col[j];
            if (col.type == GLP_FR){
                col.stat = GLP_NF; col.prim = 0.0;
            }
            else if (col.type == GLP_LO)
                lo();
            else if (col.type == GLP_UP)
                up();
            else if (col.type == GLP_DB)
            {  if (zeta * col.coef > 0.0)
                lo();
            else if (zeta * col.coef < 0.0)
                up();
            else if (Math.abs(col.lb) <= Math.abs(col.ub))
                lo();
            else
                up();
            }
            else if (col.type == GLP_FX){
                col.stat = GLP_NS; col.prim = col.lb;
            }
            col.dual = col.coef;
            P.obj_val += col.coef * col.prim;
            /* check dual feasibility */
            if (col.type == GLP_FR || col.type == GLP_LO){
                /* column has no upper bound */
                if (zeta * col.dual < - parm.tol_dj){
                    P.dbs_stat = GLP_NOFEAS;
                    if (P.some == 0 && parm.meth == GLP_PRIMAL)
                        P.some = P.m + j;
                }
                if (d_infeas < - zeta * col.dual)
                    d_infeas = - zeta * col.dual;
            }
            if (col.type == GLP_FR || col.type == GLP_UP)
            {  /* column has no lower bound */
                if (zeta * col.dual > + parm.tol_dj)
                {  P.dbs_stat = GLP_NOFEAS;
                    if (P.some == 0 && parm.meth == GLP_PRIMAL)
                        P.some = P.m + j;
                }
                if (d_infeas < + zeta * col.dual)
                    d_infeas = + zeta * col.dual;
            }
        }
        /* simulate the simplex solver output */
        if (parm.msg_lev >= GLP_MSG_ON && parm.out_dly == 0){
            xprintf("~" + P.it_cnt + ": obj = " + P.obj_val + "  infeas = " + (parm.meth == GLP_PRIMAL ? p_infeas : d_infeas) + "");
        }
        if (parm.msg_lev >= GLP_MSG_ALL && parm.out_dly == 0){
            if (P.pbs_stat == GLP_FEAS && P.dbs_stat == GLP_FEAS)
                xprintf("OPTIMAL SOLUTION FOUND");
            else if (P.pbs_stat == GLP_NOFEAS)
                xprintf("PROBLEM HAS NO FEASIBLE SOLUTION");
            else if (parm.meth == GLP_PRIMAL)
                xprintf("PROBLEM HAS UNBOUNDED SOLUTION");
            else
                xprintf("PROBLEM HAS NO DUAL FEASIBLE SOLUTION");
        }
    }

    /* solve LP problem with the simplex method */
    var _parm = {};
    var i, j, ret;
    /* check problem object */
    if (P == null || P.magic != GLP_PROB_MAGIC)
        xerror("glp_simplex: P = " + P + "; invalid problem object");
    if (P.tree != null && P.tree.reason != 0)
        xerror("glp_simplex: operation not allowed");
    /* check control parameters */
    if (parm == null){
        parm = _parm;
        glp_init_smcp(parm);
    }
    if (!(parm.msg_lev == GLP_MSG_OFF ||
        parm.msg_lev == GLP_MSG_ERR ||
        parm.msg_lev == GLP_MSG_ON  ||
        parm.msg_lev == GLP_MSG_ALL ||
        parm.msg_lev == GLP_MSG_DBG))
        xerror("glp_simplex: msg_lev = " + parm.msg_lev + "; invalid parameter");
    if (!(parm.meth == GLP_PRIMAL ||
        parm.meth == GLP_DUALP  ||
        parm.meth == GLP_DUAL))
        xerror("glp_simplex: meth = " + parm.meth + "; invalid parameter");
    if (!(parm.pricing == GLP_PT_STD || parm.pricing == GLP_PT_PSE))
        xerror("glp_simplex: pricing = " + parm.pricing + "; invalid parameter");
    if (!(parm.r_test == GLP_RT_STD || parm.r_test == GLP_RT_HAR))
        xerror("glp_simplex: r_test = " + parm.r_test + "; invalid parameter");
    if (!(0.0 < parm.tol_bnd && parm.tol_bnd < 1.0))
        xerror("glp_simplex: tol_bnd = " + parm.tol_bnd + "; invalid parameter");
    if (!(0.0 < parm.tol_dj && parm.tol_dj < 1.0))
        xerror("glp_simplex: tol_dj = " + parm.tol_dj + "; invalid parameter");
    if (!(0.0 < parm.tol_piv && parm.tol_piv < 1.0))
        xerror("glp_simplex: tol_piv = " + parm.tol_piv + "; invalid parameter");
    if (parm.it_lim < 0)
        xerror("glp_simplex: it_lim = " + parm.it_lim + "; invalid parameter");
    if (parm.tm_lim < 0)
        xerror("glp_simplex: tm_lim = " + parm.tm_lim + "; invalid parameter");
    if (parm.out_frq < 1)
        xerror("glp_simplex: out_frq = " + parm.out_frq + "; invalid parameter");
    if (parm.out_dly < 0)
        xerror("glp_simplex: out_dly = " + parm.out_dly + "; invalid parameter");
    if (!(parm.presolve == GLP_ON || parm.presolve == GLP_OFF))
        xerror("glp_simplex: presolve = " + parm.presolve + "; invalid parameter");
    /* basic solution is currently undefined */
    P.pbs_stat = P.dbs_stat = GLP_UNDEF;
    P.obj_val = 0.0;
    P.some = 0;
    /* check bounds of double-bounded variables */
    for (i = 1; i <= P.m; i++)
    {  var row = P.row[i];
        if (row.type == GLP_DB && row.lb >= row.ub)
        {  if (parm.msg_lev >= GLP_MSG_ERR)
            xprintf("glp_simplex: row " + i + ": lb = " + row.lb + ", ub = " + row.ub + "; incorrect bounds");
            ret = GLP_EBOUND;
            return ret;
        }
    }
    for (j = 1; j <= P.n; j++)
    {  var col = P.col[j];
        if (col.type == GLP_DB && col.lb >= col.ub)
        {  if (parm.msg_lev >= GLP_MSG_ERR)
            xprintf("glp_simplex: column " +  j + ": lb = " + col.lb + ", ub = " + col.ub + "; incorrect bounds");
            ret = GLP_EBOUND;
            return ret;
        }
    }
    /* solve LP problem */
    if (parm.msg_lev >= GLP_MSG_ALL)
    {   xprintf("GLPK Simplex Optimizer, v" + glp_version() + "");
        xprintf(P.m + " row" + (P.m == 1 ? "" : "s") + ", " + P.n + " column" + (P.n == 1 ? "" : "s") + ", " +
            P.nnz + " non-zero" + (P.nnz == 1 ? "" : "s") + "");
    }
    if (P.nnz == 0){
        trivial_lp(P, parm);
        ret = 0;
    }
    else if (!parm.presolve)
        ret = solve_lp(P, parm);
    else
        ret = preprocess_and_solve_lp(P, parm);
    /* return to the application program */
    return ret;
};

/***********************************************************************
 *  NAME
 *
 *  glp_init_smcp - initialize simplex method control parameters
 *
 *  SYNOPSIS
 *
 *  void glp_init_smcp(glp_smcp *parm);
 *
 *  DESCRIPTION
 *
 *  The routine glp_init_smcp initializes control parameters, which are
 *  used by the simplex solver, with default values.
 *
 *  Default values of the control parameters are stored in a glp_smcp
 *  structure, which the parameter parm points to. */

var glp_init_smcp = exports.glp_init_smcp = function(parm){
    parm.msg_lev = GLP_MSG_ALL;
    parm.meth = GLP_PRIMAL;
    parm.pricing = GLP_PT_PSE;
    parm.r_test = GLP_RT_HAR;
    parm.tol_bnd = 1e-7;
    parm.tol_dj = 1e-7;
    parm.tol_piv = 1e-10;
    parm.obj_ll = -DBL_MAX;
    parm.obj_ul = +DBL_MAX;
    parm.it_lim = INT_MAX;
    parm.tm_lim = INT_MAX;
    parm.out_frq = 500;
    parm.out_dly = 0;
    parm.presolve = GLP_OFF;
};

/***********************************************************************
 *  NAME
 *
 *  glp_get_status - retrieve generic status of basic solution
 *
 *  SYNOPSIS
 *
 *  int glp_get_status(glp_prob *lp);
 *
 *  RETURNS
 *
 *  The routine glp_get_status reports the generic status of the basic
 *  solution for the specified problem object as follows:
 *
 *  GLP_OPT    - solution is optimal;
 *  GLP_FEAS   - solution is feasible;
 *  GLP_INFEAS - solution is infeasible;
 *  GLP_NOFEAS - problem has no feasible solution;
 *  GLP_UNBND  - problem has unbounded solution;
 *  GLP_UNDEF  - solution is undefined. */

var glp_get_status = exports.glp_get_status = function(lp){
    var status;
    status = glp_get_prim_stat(lp);
    switch (status)
    {  case GLP_FEAS:
        switch (glp_get_dual_stat(lp))
        {  case GLP_FEAS:
            status = GLP_OPT;
            break;
            case GLP_NOFEAS:
                status = GLP_UNBND;
                break;
            case GLP_UNDEF:
            case GLP_INFEAS:
                //status = status;
                break;
            default:
                xassert(lp != lp);
        }
        break;
        case GLP_UNDEF:
        case GLP_INFEAS:
        case GLP_NOFEAS:
            //status = status;
            break;
        default:
            xassert(lp != lp);
    }
    return status;
};

var glp_get_prim_stat = exports.glp_get_prim_stat = function(lp){
    return lp.pbs_stat;
};

var glp_get_dual_stat = exports.glp_get_dual_stat = function(lp){
    return lp.dbs_stat;
};

var glp_get_obj_val = exports.glp_get_obj_val = function(lp){
    return lp.obj_val;
};

var glp_get_row_stat = exports.glp_get_row_stat = function(lp, i){
    if (!(1 <= i && i <= lp.m))
        xerror("glp_get_row_stat: i = " + i + "; row number out of range");
    return lp.row[i].stat;
};

var glp_get_row_prim = exports.glp_get_row_prim = function(lp, i){
    if (!(1 <= i && i <= lp.m))
        xerror("glp_get_row_prim: i = " + i + "; row number out of range");
    return lp.row[i].prim;
};

var glp_get_row_dual = exports.glp_get_row_dual = function(lp, i){
    if (!(1 <= i && i <= lp.m))
        xerror("glp_get_row_dual: i = " + i + "; row number out of range");
    return lp.row[i].dual;
};

var glp_get_col_stat = exports.glp_get_col_stat = function(lp, j){
    if (!(1 <= j && j <= lp.n))
        xerror("glp_get_col_stat: j = " + j + "; column number out of range");
    return lp.col[j].stat;
};

var glp_get_col_prim = exports.glp_get_col_prim = function(lp, j){
    if (!(1 <= j && j <= lp.n))
        xerror("glp_get_col_prim: j = " + j + "; column number out of range");
    return lp.col[j].prim;
};

var glp_get_col_dual = exports.glp_get_col_dual = function(lp, j){
    if (!(1 <= j && j <= lp.n))
        xerror("glp_get_col_dual: j = " + j + "; column number out of range");
    return lp.col[j].dual;
};

var glp_get_unbnd_ray = exports.glp_get_unbnd_ray = function(lp){
    var k = lp.some;
    xassert(k >= 0);
    if (k > lp.m + lp.n) k = 0;
    return k;
}
var glp_set_col_kind = exports.glp_set_col_kind = function(mip, j, kind){
    if (!(1 <= j && j <= mip.n))
        xerror("glp_set_col_kind: j = " + j + "; column number out of range");
    var col = mip.col[j];
    switch (kind)
    {  case GLP_CV:
        col.kind = GLP_CV;
        break;
        case GLP_IV:
            col.kind = GLP_IV;
            break;
        case GLP_BV:
            col.kind = GLP_IV;
            if (!(col.type == GLP_DB && col.lb == 0.0 && col.ub ==
                1.0)) glp_set_col_bnds(mip, j, GLP_DB, 0.0, 1.0);
            break;
        default:
            xerror("glp_set_col_kind: j = " + j + "; kind = " + kind + "; invalid column kind");
    }
};

var glp_get_col_kind = exports.glp_get_col_kind = function(mip, j){
    if (!(1 <= j && j <= mip.n))
        xerror("glp_get_col_kind: j = " + j + "; column number out of range");
    var col = mip.col[j];
    var kind = col.kind;
    switch (kind)
    {  case GLP_CV:
        break;
        case GLP_IV:
            if (col.type == GLP_DB && col.lb == 0.0 && col.ub == 1.0)
                kind = GLP_BV;
            break;
        default:
            xassert(kind != kind);
    }
    return kind;
};

var glp_get_num_int = exports.glp_get_num_int = function(mip){
    var col;
    var count = 0;
    for (var j = 1; j <= mip.n; j++)
    {  col = mip.col[j];
        if (col.kind == GLP_IV) count++;
    }
    return count;
};

var glp_get_num_bin = exports.glp_get_num_bin = function(mip){
    var col;
    var count = 0;
    for (var j = 1; j <= mip.n; j++)
    {  col = mip.col[j];
        if (col.kind == GLP_IV && col.type == GLP_DB && col.lb ==
            0.0 && col.ub == 1.0) count++;
    }
    return count;
};

var glp_intopt = exports.glp_intopt = function(P, parm){
    function solve_mip(P, parm){
        /* solve MIP directly without using the preprocessor */
        var T;
        var ret;
        /* optimal basis to LP relaxation must be provided */
        if (glp_get_status(P) != GLP_OPT)
        {  if (parm.msg_lev >= GLP_MSG_ERR)
            xprintf("glp_intopt: optimal basis to initial LP relaxation not provided");
            ret = GLP_EROOT;
            return ret;
        }
        /* it seems all is ok */
        if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("Integer optimization begins...");
        /* create the branch-and-bound tree */
        T = ios_create_tree(P, parm);
        /* solve the problem instance */
        ret = ios_driver(T);
        /* delete the branch-and-bound tree */
        ios_delete_tree(T);
        /* analyze exit code reported by the mip driver */
        if (ret == 0)
        {  if (P.mip_stat == GLP_FEAS)
        {  if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("INTEGER OPTIMAL SOLUTION FOUND");
            P.mip_stat = GLP_OPT;
        }
        else
        {  if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("PROBLEM HAS NO INTEGER FEASIBLE SOLUTION");
            P.mip_stat = GLP_NOFEAS;
        }
        }
        else if (ret == GLP_EMIPGAP)
        {  if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("RELATIVE MIP GAP TOLERANCE REACHED; SEARCH TERMINATED");
        }
        else if (ret == GLP_ETMLIM)
        {  if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("TIME LIMIT EXCEEDED; SEARCH TERMINATED");
        }
        else if (ret == GLP_EFAIL)
        {  if (parm.msg_lev >= GLP_MSG_ERR)
            xprintf("glp_intopt: cannot solve current LP relaxation");
        }
        else if (ret == GLP_ESTOP)
        {  if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("SEARCH TERMINATED BY APPLICATION");
        }
        else
            xassert(ret != ret);
        return ret;
    }

    function preprocess_and_solve_mip(P, parm){
        /* solve MIP using the preprocessor */
        var env = get_env_ptr();
        var term_out = env.term_out;
        var npp;
        var mip = null;
        var bfcp = {};
        var smcp = {};
        var ret;

        function done(){
            /* delete the transformed MIP, if it exists */
            if (mip != null) glp_delete_prob(mip);
            return ret;
        }

        function post(){
            npp_postprocess(npp, mip);
            /* the transformed MIP is no longer needed */
            glp_delete_prob(mip);
            mip = null;
            /* store solution to the original problem */
            npp_unload_sol(npp, P);
            return done();
        }


        if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("Preprocessing...");
        /* create preprocessor workspace */
        npp = npp_create_wksp();
        /* load original problem into the preprocessor workspace */
        npp_load_prob(npp, P, GLP_OFF, GLP_MIP, GLP_OFF);
        /* process MIP prior to applying the branch-and-bound method */
        if (!term_out || parm.msg_lev < GLP_MSG_ALL)
            env.term_out = GLP_OFF;
        else
            env.term_out = GLP_ON;
        ret = npp_integer(npp, parm);
        env.term_out = term_out;
        if (ret == 0)
        {

        }
        else if (ret == GLP_ENOPFS)
        {  if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("PROBLEM HAS NO PRIMAL FEASIBLE SOLUTION");
        }
        else if (ret == GLP_ENODFS)
        {  if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("LP RELAXATION HAS NO DUAL FEASIBLE SOLUTION");
        }
        else
            xassert(ret != ret);
        if (ret != 0) return done();
        /* build transformed MIP */
        mip = glp_create_prob();
        npp_build_prob(npp, mip);
        /* if the transformed MIP is empty, it has empty solution, which
         is optimal */
        if (mip.m == 0 && mip.n == 0)
        {  mip.mip_stat = GLP_OPT;
            mip.mip_obj = mip.c0;
            if (parm.msg_lev >= GLP_MSG_ALL)
            {  xprintf("Objective value = " + mip.mip_obj + "");
                xprintf("INTEGER OPTIMAL SOLUTION FOUND BY MIP PREPROCESSOR");
            }
            return post();
        }
        /* display some statistics */
        if (parm.msg_lev >= GLP_MSG_ALL)
        {   var ni = glp_get_num_int(mip);
            var nb = glp_get_num_bin(mip);
            var s;
            xprintf(mip.m + " row" + (mip.m == 1 ? "" : "s") + ", " + mip.n + " column" + (mip.n == 1 ? "" : "s") +
                ", " + mip.nnz + " non-zero" + (mip.nnz == 1 ? "" : "s") + "");
            if (nb == 0)
                s = "none of";
            else if (ni == 1 && nb == 1)
                s = "";
            else if (nb == 1)
                s = "one of";
            else if (nb == ni)
                s = "all of";
            else
                s = nb + " of";
            xprintf(ni + " integer variable" + (ni == 1 ? "" : "s") + ", " + s + " which " + (nb == 1 ? "is" : "are") + " binary");
        }
        /* inherit basis factorization control parameters */
        glp_get_bfcp(P, bfcp);
        glp_set_bfcp(mip, bfcp);
        /* scale the transformed problem */
        if (!term_out || parm.msg_lev < GLP_MSG_ALL)
            env.term_out = GLP_OFF;
        else
            env.term_out = GLP_ON;
        glp_scale_prob(mip,
            GLP_SF_GM | GLP_SF_EQ | GLP_SF_2N | GLP_SF_SKIP);
        env.term_out = term_out;
        /* build advanced initial basis */
        if (!term_out || parm.msg_lev < GLP_MSG_ALL)
            env.term_out = GLP_OFF;
        else
            env.term_out = GLP_ON;
        glp_adv_basis(mip, 0);
        env.term_out = term_out;
        /* solve initial LP relaxation */
        if (parm.msg_lev >= GLP_MSG_ALL)
            xprintf("Solving LP relaxation...");
        glp_init_smcp(smcp);
        smcp.msg_lev = parm.msg_lev;
        mip.it_cnt = P.it_cnt;
        ret = glp_simplex(mip, smcp);
        P.it_cnt = mip.it_cnt;
        if (ret != 0)
        {  if (parm.msg_lev >= GLP_MSG_ERR)
            xprintf("glp_intopt: cannot solve LP relaxation");
            ret = GLP_EFAIL;
            return done();
        }
        /* check status of the basic solution */
        ret = glp_get_status(mip);
        if (ret == GLP_OPT)
            ret = 0;
        else if (ret == GLP_NOFEAS)
            ret = GLP_ENOPFS;
        else if (ret == GLP_UNBND)
            ret = GLP_ENODFS;
        else
            xassert(ret != ret);
        if (ret != 0) return done();
        /* solve the transformed MIP */
        mip.it_cnt = P.it_cnt;
        ret = solve_mip(mip, parm);
        P.it_cnt = mip.it_cnt;
        /* only integer feasible solution can be postprocessed */
        if (!(mip.mip_stat == GLP_OPT || mip.mip_stat == GLP_FEAS))
        {  P.mip_stat = mip.mip_stat;
            return done();
        }
        return post();
    }

    /* solve MIP problem with the branch-and-bound method */
    var i, j, ret, col;
    /* check problem object */
    if (P == null || P.magic != GLP_PROB_MAGIC)
        xerror("glp_intopt: P = " + P + "; invalid problem object");
    if (P.tree != null)
        xerror("glp_intopt: operation not allowed");
    /* check control parameters */
    if (parm == null){
        parm = {};
        glp_init_iocp(parm);
    }
    if (!(parm.msg_lev == GLP_MSG_OFF ||
        parm.msg_lev == GLP_MSG_ERR ||
        parm.msg_lev == GLP_MSG_ON  ||
        parm.msg_lev == GLP_MSG_ALL ||
        parm.msg_lev == GLP_MSG_DBG))
        xerror("glp_intopt: msg_lev = " + parm.msg_lev + "; invalid parameter");
    if (!(parm.br_tech == GLP_BR_FFV ||
        parm.br_tech == GLP_BR_LFV ||
        parm.br_tech == GLP_BR_MFV ||
        parm.br_tech == GLP_BR_DTH ||
        parm.br_tech == GLP_BR_PCH))
        xerror("glp_intopt: br_tech = " + parm.br_tech + "; invalid parameter");
    if (!(parm.bt_tech == GLP_BT_DFS ||
        parm.bt_tech == GLP_BT_BFS ||
        parm.bt_tech == GLP_BT_BLB ||
        parm.bt_tech == GLP_BT_BPH))
        xerror("glp_intopt: bt_tech = " + parm.bt_tech + "; invalid parameter");
    if (!(0.0 < parm.tol_int && parm.tol_int < 1.0))
        xerror("glp_intopt: tol_int = " + parm.tol_int + "; invalid parameter");
    if (!(0.0 < parm.tol_obj && parm.tol_obj < 1.0))
        xerror("glp_intopt: tol_obj = " + parm.tol_obj + "; invalid parameter");
    if (parm.tm_lim < 0)
        xerror("glp_intopt: tm_lim = " + parm.tm_lim + "; invalid parameter");
    if (parm.out_frq < 0)
        xerror("glp_intopt: out_frq = " + parm.out_frq + "; invalid parameter");
    if (parm.out_dly < 0)
        xerror("glp_intopt: out_dly = " + parm.out_dly + "; invalid parameter");
    if (!(0 <= parm.cb_size && parm.cb_size <= 256))
        xerror("glp_intopt: cb_size = " + parm.cb_size + "; invalid parameter");
    if (!(parm.pp_tech == GLP_PP_NONE ||
        parm.pp_tech == GLP_PP_ROOT ||
        parm.pp_tech == GLP_PP_ALL))
        xerror("glp_intopt: pp_tech = " + parm.pp_tech + "; invalid parameter");
    if (parm.mip_gap < 0.0)
        xerror("glp_intopt: mip_gap = " + parm.mip_gap + "; invalid parameter");
    if (!(parm.mir_cuts == GLP_ON || parm.mir_cuts == GLP_OFF))
        xerror("glp_intopt: mir_cuts = " + parm.mir_cuts + "; invalid parameter");
    if (!(parm.gmi_cuts == GLP_ON || parm.gmi_cuts == GLP_OFF))
        xerror("glp_intopt: gmi_cuts = " + parm.gmi_cuts + "; invalid parameter");
    if (!(parm.cov_cuts == GLP_ON || parm.cov_cuts == GLP_OFF))
        xerror("glp_intopt: cov_cuts = " + parm.cov_cuts + "; invalid parameter");
    if (!(parm.clq_cuts == GLP_ON || parm.clq_cuts == GLP_OFF))
        xerror("glp_intopt: clq_cuts = " + parm.clq_cuts + "; invalid parameter");
    if (!(parm.presolve == GLP_ON || parm.presolve == GLP_OFF))
        xerror("glp_intopt: presolve = " + parm.presolve + "; invalid parameter");
    if (!(parm.binarize == GLP_ON || parm.binarize == GLP_OFF))
        xerror("glp_intopt: binarize = " + parm.binarize + "; invalid parameter");
    if (!(parm.fp_heur == GLP_ON || parm.fp_heur == GLP_OFF))
        xerror("glp_intopt: fp_heur = " + parm.fp_heur + "; invalid parameter");
    /* integer solution is currently undefined */
    P.mip_stat = GLP_UNDEF;
    P.mip_obj = 0.0;
    /* check bounds of double-bounded variables */
    for (i = 1; i <= P.m; i++)
    {   var row = P.row[i];
        if (row.type == GLP_DB && row.lb >= row.ub)
        {  if (parm.msg_lev >= GLP_MSG_ERR)
            xprintf("glp_intopt: row " + i + ": lb = " + row.lb + ", ub = " + row.ub + "; incorrect bounds");
            ret = GLP_EBOUND;
            return ret;
        }
    }
    for (j = 1; j <= P.n; j++)
    {   col = P.col[j];
        if (col.type == GLP_DB && col.lb >= col.ub)
        {  if (parm.msg_lev >= GLP_MSG_ERR)
            xprintf("glp_intopt: column " + j + ": lb = " + col.lb + ", ub = " + col.ub + "; incorrect bounds");
            ret = GLP_EBOUND;
            return ret;
        }
    }
    /* bounds of all integer variables must be integral */
    for (j = 1; j <= P.n; j++)
    {   col = P.col[j];
        if (col.kind != GLP_IV) continue;
        if (col.type == GLP_LO || col.type == GLP_DB)
        {  if (col.lb != Math.floor(col.lb))
        {  if (parm.msg_lev >= GLP_MSG_ERR)
            xprintf("glp_intopt: integer column " + j + " has non-integer lower bound " + col.lb + "");
            ret = GLP_EBOUND;
            return ret;
        }
        }
        if (col.type == GLP_UP || col.type == GLP_DB)
        {  if (col.ub != Math.floor(col.ub))
        {  if (parm.msg_lev >= GLP_MSG_ERR)
            xprintf("glp_intopt: integer column " + j + " has non-integer upper bound " + col.ub + "");
            ret = GLP_EBOUND;
            return ret;
        }
        }
        if (col.type == GLP_FX)
        {  if (col.lb != Math.floor(col.lb))
        {  if (parm.msg_lev >= GLP_MSG_ERR)
            xprintf("glp_intopt: integer column " + j + " has non-integer fixed value " + col.lb + "");
            ret = GLP_EBOUND;
            return ret;
        }
        }
    }
    /* solve MIP problem */
    if (parm.msg_lev >= GLP_MSG_ALL)
    {   var ni = glp_get_num_int(P);
        var nb = glp_get_num_bin(P);
        var s;
        xprintf("GLPK Integer Optimizer, v" + glp_version() + "");
        xprintf(P.m + " row" + (P.m == 1 ? "" : "s") + ", " + P.n + " column" + (P.n == 1 ? "" : "s") + ", " + P.nnz + " non-zero" + (P.nnz == 1 ? "" : "s") + "");
        if (nb == 0)
            s = "none of";
        else if (ni == 1 && nb == 1)
            s = "";
        else if (nb == 1)
            s = "one of";
        else if (nb == ni)
            s = "all of";
        else
            s = nb + " of";
        xprintf(ni + " integer variable" + (ni == 1 ? "" : "s") + ", " + s + " which " + (nb == 1 ? "is" : "are") + " binary");
    }
    if (!parm.presolve)
        ret = solve_mip(P, parm);
    else
        ret = preprocess_and_solve_mip(P, parm);
    /* return to the application program */
    return ret;
};

var glp_init_iocp = exports.glp_init_iocp = function(parm){
    parm.msg_lev = GLP_MSG_ALL;
    parm.br_tech = GLP_BR_DTH;
    parm.bt_tech = GLP_BT_BLB;
    parm.tol_int = 1e-5;
    parm.tol_obj = 1e-7;
    parm.tm_lim = INT_MAX;
    parm.out_frq = 5000;
    parm.out_dly = 10000;
    parm.cb_func = null;
    parm.cb_info = null;
    parm.cb_size = 0;
    parm.pp_tech = GLP_PP_ALL;
    parm.mip_gap = 0.0;
    parm.mir_cuts = GLP_OFF;
    parm.gmi_cuts = GLP_OFF;
    parm.cov_cuts = GLP_OFF;
    parm.clq_cuts = GLP_OFF;
    parm.presolve = GLP_OFF;
    parm.binarize = GLP_OFF;
    parm.fp_heur = GLP_OFF;
};

var glp_mip_status = exports.glp_mip_status = function(mip){
    return mip.mip_stat;
};

var glp_mip_obj_val = exports.glp_mip_obj_val = function(mip){
    return mip.mip_obj;
};

var glp_mip_row_val = exports.glp_mip_row_val = function(mip, i){
    if (!(1 <= i && i <= mip.m))
        xerror("glp_mip_row_val: i = " + i + "; row number out of range");
    return mip.row[i].mipx;
};

var glp_mip_col_val = exports.glp_mip_col_val = function(mip, j){
    if (!(1 <= j && j <= mip.n))
        xerror("glp_mip_col_val: j = " + j + "; column number out of range");
    return mip.col[j].mipx;
};

function _glp_check_kkt(P, sol, cond, callback){
    /* check feasibility and optimality conditions */
    var m = P.m;
    var n = P.n;
    var row, col, aij;
    var i, j, ae_ind, re_ind;
    var e, sp, sn, t, ae_max, re_max;
    if (!(sol == GLP_SOL || sol == GLP_IPT || sol == GLP_MIP))
        xerror("glp_check_kkt: sol = " + sol + "; invalid solution indicator");
    if (!(cond == GLP_KKT_PE || cond == GLP_KKT_PB ||
        cond == GLP_KKT_DE || cond == GLP_KKT_DB ||
        cond == GLP_KKT_CS))
        xerror("glp_check_kkt: cond = " + cond + "; invalid condition indicator ");
    ae_max = re_max = 0.0;
    ae_ind = re_ind = 0;
    if (cond == GLP_KKT_PE)
    {  /* xR - A * xS = 0 */
        for (i = 1; i <= m; i++)
        {  row = P.row[i];
            sp = sn = 0.0;
            /* t := xR[i] */
            if (sol == GLP_SOL)
                t = row.prim;
            else if (sol == GLP_IPT)
                t = row.pval;
            else if (sol == GLP_MIP)
                t = row.mipx;
            else
                xassert(sol != sol);
            if (t >= 0.0) sp += t; else sn -= t;
            for (aij = row.ptr; aij != null; aij = aij.r_next)
            {  col = aij.col;
                /* t := - a[i,j] * xS[j] */
                if (sol == GLP_SOL)
                    t = - aij.val * col.prim;
                else if (sol == GLP_IPT)
                    t = - aij.val * col.pval;
                else if (sol == GLP_MIP)
                    t = - aij.val * col.mipx;
                else
                    xassert(sol != sol);
                if (t >= 0.0) sp += t; else sn -= t;
            }
            /* absolute error */
            e = Math.abs(sp - sn);
            if (ae_max < e){
                ae_max = e;
                ae_ind = i;
            }
            /* relative error */
            e /= (1.0 + sp + sn);
            if (re_max < e){
                re_max = e;
                re_ind = i;
            }

        }
    }
    else if (cond == GLP_KKT_PB)
    {  /* lR <= xR <= uR */
        for (i = 1; i <= m; i++)
        {  row = P.row[i];
            /* t := xR[i] */
            if (sol == GLP_SOL)
                t = row.prim;
            else if (sol == GLP_IPT)
                t = row.pval;
            else if (sol == GLP_MIP)
                t = row.mipx;
            else
                xassert(sol != sol);
            /* check lower bound */
            if (row.type == GLP_LO || row.type == GLP_DB ||
                row.type == GLP_FX)
            {  if (t < row.lb)
            {  /* absolute error */
                e = row.lb - t;
                if (ae_max < e){
                    ae_max = e;
                    ae_ind = i;
                }
                /* relative error */
                e /= (1.0 + Math.abs(row.lb));
                if (re_max < e){
                    re_max = e;
                    re_ind = i;
                }
            }
            }
            /* check upper bound */
            if (row.type == GLP_UP || row.type == GLP_DB ||
                row.type == GLP_FX)
            {  if (t > row.ub)
            {  /* absolute error */
                e = t - row.ub;
                if (ae_max < e){
                    ae_max = e;
                    ae_ind = i;
                }

                /* relative error */
                e /= (1.0 + Math.abs(row.ub));
                if (re_max < e){
                    re_max = e;
                    re_ind = i;
                }
            }
            }
        }
        /* lS <= xS <= uS */
        for (j = 1; j <= n; j++)
        {  col = P.col[j];
            /* t := xS[j] */
            if (sol == GLP_SOL)
                t = col.prim;
            else if (sol == GLP_IPT)
                t = col.pval;
            else if (sol == GLP_MIP)
                t = col.mipx;
            else
                xassert(sol != sol);
            /* check lower bound */
            if (col.type == GLP_LO || col.type == GLP_DB ||
                col.type == GLP_FX)
            {  if (t < col.lb)
            {  /* absolute error */
                e = col.lb - t;
                if (ae_max < e){
                    ae_max = e;
                    ae_ind = m+j;
                }
                /* relative error */
                e /= (1.0 + Math.abs(col.lb));
                if (re_max < e){
                    re_max = e;
                    re_ind = m+j;
                }
            }
            }
            /* check upper bound */
            if (col.type == GLP_UP || col.type == GLP_DB ||
                col.type == GLP_FX)
            {  if (t > col.ub)
            {  /* absolute error */
                e = t - col.ub;
                if (ae_max < e){
                    ae_max = e;
                    ae_ind = m+j;
                }
                /* relative error */
                e /= (1.0 + Math.abs(col.ub));
                if (re_max < e){
                    re_max = e;
                    re_ind = m+j;
                }
            }
            }
        }
    }
    else if (cond == GLP_KKT_DE)
    {  /* A' * (lambdaR - cR) + (lambdaS - cS) = 0 */
        for (j = 1; j <= n; j++)
        {  col = P.col[j];
            sp = sn = 0.0;
            /* t := lambdaS[j] - cS[j] */
            if (sol == GLP_SOL)
                t = col.dual - col.coef;
            else if (sol == GLP_IPT)
                t = col.dval - col.coef;
            else
                xassert(sol != sol);
            if (t >= 0.0) sp += t; else sn -= t;
            for (aij = col.ptr; aij != null; aij = aij.c_next)
            {  row = aij.row;
                /* t := a[i,j] * (lambdaR[i] - cR[i]) */
                if (sol == GLP_SOL)
                    t = aij.val * row.dual;
                else if (sol == GLP_IPT)
                    t = aij.val * row.dval;
                else
                    xassert(sol != sol);
                if (t >= 0.0) sp += t; else sn -= t;
            }
            /* absolute error */
            e = Math.abs(sp - sn);
            if (ae_max < e){
                ae_max = e;
                ae_ind = m+j;
            }
            /* relative error */
            e /= (1.0 + sp + sn);
            if (re_max < e){
                re_max = e;
                re_ind = m+j;
            }
        }
    }
    else if (cond == GLP_KKT_DB)
    {  /* check lambdaR */
        for (i = 1; i <= m; i++)
        {  row = P.row[i];
            /* t := lambdaR[i] */
            if (sol == GLP_SOL)
                t = row.dual;
            else if (sol == GLP_IPT)
                t = row.dval;
            else
                xassert(sol != sol);
            /* correct sign */
            if (P.dir == GLP_MIN)
                t = + t;
            else if (P.dir == GLP_MAX)
                t = - t;
            else
                xassert(P != P);
            /* check for positivity */
            if (row.type == GLP_FR || row.type == GLP_LO)
            {  if (t < 0.0)
            {  e = - t;
                if (ae_max < e){
                    ae_max = re_max = e;
                    ae_ind = re_ind = i;
                }
            }
            }
            /* check for negativity */
            if (row.type == GLP_FR || row.type == GLP_UP)
            {  if (t > 0.0)
            {  e = + t;
                if (ae_max < e){
                    ae_max = re_max = e;
                    ae_ind = re_ind = i;
                }
            }
            }
        }
        /* check lambdaS */
        for (j = 1; j <= n; j++)
        {  col = P.col[j];
            /* t := lambdaS[j] */
            if (sol == GLP_SOL)
                t = col.dual;
            else if (sol == GLP_IPT)
                t = col.dval;
            else
                xassert(sol != sol);
            /* correct sign */
            if (P.dir == GLP_MIN)
                t = + t;
            else if (P.dir == GLP_MAX)
                t = - t;
            else
                xassert(P != P);
            /* check for positivity */
            if (col.type == GLP_FR || col.type == GLP_LO)
            {  if (t < 0.0)
            {  e = - t;
                if (ae_max < e){
                    ae_max = re_max = e;
                    ae_ind = re_ind = m+j;
                }
            }
            }
            /* check for negativity */
            if (col.type == GLP_FR || col.type == GLP_UP)
            {  if (t > 0.0)
            {  e = + t;
                if (ae_max < e){
                    ae_max = re_max = e;
                    ae_ind = re_ind = m+j;
                }
            }
            }
        }
    }
    else
        xassert(cond != cond);

    callback(ae_max, ae_ind, re_max, re_ind);
}

var glp_bf_exists = exports.glp_bf_exists = function(lp){
    return (lp.m == 0 || lp.valid);
};

var glp_factorize = exports.glp_factorize = function(lp){

    function b_col(lp, j, ind, val){
        var m = lp.m;
        var aij;
        var k, len;
        xassert(1 <= j && j <= m);
        /* determine the ordinal number of basic auxiliary or structural
         variable x[k] corresponding to basic variable xB[j] */
        k = lp.head[j];
        /* build j-th column of the basic matrix, which is k-th column of
         the scaled augmented matrix (I | -R*A*S) */
        if (k <= m)
        {  /* x[k] is auxiliary variable */
            len = 1;
            ind[1] = k;
            val[1] = 1.0;
        }
        else
        {  /* x[k] is structural variable */
            len = 0;
            for (aij = lp.col[k-m].ptr; aij != null; aij = aij.c_next)
            {  len++;
                ind[len] = aij.row.i;
                val[len] = - aij.row.rii * aij.val * aij.col.sjj;
            }
        }
        return len;
    }

    var m = lp.m;
    var n = lp.n;
    var row = lp.row;
    var col = lp.col;
    var head = lp.head;
    var j, k, stat, ret;
    /* invalidate the basis factorization */
    lp.valid = 0;
    /* build the basis header */
    j = 0;
    for (k = 1; k <= m+n; k++)
    {  if (k <= m)
    {  stat = row[k].stat;
        row[k].bind = 0;
    }
    else
    {  stat = col[k-m].stat;
        col[k-m].bind = 0;
    }
        if (stat == GLP_BS)
        {  j++;
            if (j > m)
            {  /* too many basic variables */
                ret = GLP_EBADB;
                return ret;
            }
            head[j] = k;
            if (k <= m)
                row[k].bind = j;
            else
                col[k-m].bind = j;
        }
    }
    if (j < m)
    {  /* too few basic variables */
        ret = GLP_EBADB;
        return ret;
    }
    /* try to factorize the basis matrix */
    if (m > 0)
    {  if (lp.bfd == null)
    {  lp.bfd = bfd_create_it();
        copy_bfcp(lp);
    }
        switch (bfd_factorize(lp.bfd, m, lp.head, b_col, lp))
        {  case 0:
            /* ok */
            break;
            case BFD_ESING:
                /* singular matrix */
                ret = GLP_ESING;
                return ret;
            case BFD_ECOND:
                /* ill-conditioned matrix */
                ret = GLP_ECOND;
                return ret;
            default:
                xassert(lp != lp);
        }
        lp.valid = 1;
    }
    /* factorization successful */
    ret = 0;
    /* bring the return code to the calling program */
    return ret;
};

var glp_bf_updated = exports.glp_bf_updated = function(lp){
    if (!(lp.m == 0 || lp.valid))
        xerror("glp_bf_update: basis factorization does not exist");
    return (lp.m == 0 ? 0 : bfd_get_count(lp.bfd));
};

var glp_get_bfcp = exports.glp_get_bfcp = function(lp, parm){
    var bfcp = lp.bfcp;
    if (bfcp == null)
    {  parm.type = GLP_BF_FT;
        parm.lu_size = 0;
        parm.piv_tol = 0.10;
        parm.piv_lim = 4;
        parm.suhl = GLP_ON;
        parm.eps_tol = 1e-15;
        parm.max_gro = 1e+10;
        parm.nfs_max = 100;
        parm.upd_tol = 1e-6;
        parm.nrs_max = 100;
        parm.rs_size = 0;
    }
    else
        xcopyObj(parm, bfcp);
};

function copy_bfcp(lp){
    var parm = {};
    glp_get_bfcp(lp, parm);
    bfd_set_parm(lp.bfd, parm);
}

var glp_set_bfcp = exports.glp_set_bfcp = function(lp, parm){
    var bfcp = lp.bfcp;
    if (parm == null)
    {  /* reset to default values */
        if (bfcp != null)
            lp.bfcp = null;
    }
    else
    {  /* set to specified values */
        if (bfcp == null)
            bfcp = lp.bfcp = {};
        xcopyObj(bfcp, parm);
        if (!(bfcp.type == GLP_BF_FT || bfcp.type == GLP_BF_BG ||
            bfcp.type == GLP_BF_GR))
            xerror("glp_set_bfcp: type = " + bfcp.type + "; invalid parameter");
        if (bfcp.lu_size < 0)
            xerror("glp_set_bfcp: lu_size = " + bfcp.lu_size + "; invalid parameter");
        if (!(0.0 < bfcp.piv_tol && bfcp.piv_tol < 1.0))
            xerror("glp_set_bfcp: piv_tol = " + bfcp.piv_tol + "; invalid parameter");
        if (bfcp.piv_lim < 1)
            xerror("glp_set_bfcp: piv_lim = " + bfcp.piv_lim + "; invalid parameter");
        if (!(bfcp.suhl == GLP_ON || bfcp.suhl == GLP_OFF))
            xerror("glp_set_bfcp: suhl = " + bfcp.suhl + "; invalid parameter");
        if (!(0.0 <= bfcp.eps_tol && bfcp.eps_tol <= 1e-6))
            xerror("glp_set_bfcp: eps_tol = " + bfcp.eps_tol + "; invalid parameter");
        if (bfcp.max_gro < 1.0)
            xerror("glp_set_bfcp: max_gro = " + bfcp.max_gro + "; invalid parameter");
        if (!(1 <= bfcp.nfs_max && bfcp.nfs_max <= 32767))
            xerror("glp_set_bfcp: nfs_max = " + bfcp.nfs_max + "; invalid parameter");
        if (!(0.0 < bfcp.upd_tol && bfcp.upd_tol < 1.0))
            xerror("glp_set_bfcp: upd_tol = " + bfcp.upd_tol + "; invalid parameter");
        if (!(1 <= bfcp.nrs_max && bfcp.nrs_max <= 32767))
            xerror("glp_set_bfcp: nrs_max = " + bfcp.nrs_max + "; invalid parameter");
        if (bfcp.rs_size < 0)
            xerror("glp_set_bfcp: rs_size = " + bfcp.nrs_max + "; invalid parameter");
        if (bfcp.rs_size == 0)
            bfcp.rs_size = 20 * bfcp.nrs_max;
    }
    if (lp.bfd != null) copy_bfcp(lp);
};

var glp_get_bhead = exports.glp_get_bhead = function(lp, k){
    if (!(lp.m == 0 || lp.valid))
        xerror("glp_get_bhead: basis factorization does not exist");
    if (!(1 <= k && k <= lp.m))
        xerror("glp_get_bhead: k = " + k + "; index out of range");
    return lp.head[k];
};

var glp_get_row_bind = exports.glp_get_row_bind = function(lp, i){
    if (!(lp.m == 0 || lp.valid))
        xerror("glp_get_row_bind: basis factorization does not exist");
    if (!(1 <= i && i <= lp.m))
        xerror("glp_get_row_bind: i = " + i + "; row number out of range");
    return lp.row[i].bind;
};

var glp_get_col_bind = exports.glp_get_col_bind = function(lp, j){
    if (!(lp.m == 0 || lp.valid))
        xerror("glp_get_col_bind: basis factorization does not exist");
    if (!(1 <= j && j <= lp.n))
        xerror("glp_get_col_bind: j = " + j + "; column number out of range");
    return lp.col[j].bind;
};

var glp_ftran = exports.glp_ftran = function(lp, x){
    var m = lp.m;
    var row = lp.row;
    var col = lp.col;
    var i, k;
    /* B*x = b ===> (R*B*SB)*(inv(SB)*x) = R*b ===>
     B"*x" = b", where b" = R*b, x = SB*x" */
    if (!(m == 0 || lp.valid))
        xerror("glp_ftran: basis factorization does not exist");
    /* b" := R*b */
    for (i = 1; i <= m; i++)
        x[i] *= row[i].rii;
    /* x" := inv(B")*b" */
    if (m > 0) bfd_ftran(lp.bfd, x);
    /* x := SB*x" */
    for (i = 1; i <= m; i++)
    {  k = lp.head[i];
        if (k <= m)
            x[i] /= row[k].rii;
        else
            x[i] *= col[k-m].sjj;
    }
};

var glp_btran = exports.glp_btran = function(lp, x){
    var m = lp.m;
    var row = lp.row;
    var col = lp.col;
    var i, k;
    /* B'*x = b ===> (SB*B'*R)*(inv(R)*x) = SB*b ===>
     (B")'*x" = b", where b" = SB*b, x = R*x" */
    if (!(m == 0 || lp.valid))
        xerror("glp_btran: basis factorization does not exist");
    /* b" := SB*b */
    for (i = 1; i <= m; i++)
    {  k = lp.head[i];
        if (k <= m)
            x[i] /= row[k].rii;
        else
            x[i] *= col[k-m].sjj;
    }
    /* x" := inv[(B")']*b" */
    if (m > 0) bfd_btran(lp.bfd, x);
    /* x := R*x" */
    for (i = 1; i <= m; i++)
        x[i] *= row[i].rii;
};

var glp_warm_up = exports.glp_warm_up = function(P){
    var row;
    var col;
    var aij;
    var i, j, type, ret;
    var eps, temp, work;
    /* invalidate basic solution */
    P.pbs_stat = P.dbs_stat = GLP_UNDEF;
    P.obj_val = 0.0;
    P.some = 0;
    for (i = 1; i <= P.m; i++)
    {  row = P.row[i];
        row.prim = row.dual = 0.0;
    }
    for (j = 1; j <= P.n; j++)
    {  col = P.col[j];
        col.prim = col.dual = 0.0;
    }
    /* compute the basis factorization, if necessary */
    if (!glp_bf_exists(P))
    {  ret = glp_factorize(P);
        if (ret != 0) return ret;
    }
    /* allocate working array */
    work = new Array(1+P.m);
    /* determine and store values of non-basic variables, compute
     vector (- N * xN) */
    for (i = 1; i <= P.m; i++)
        work[i] = 0.0;
    for (i = 1; i <= P.m; i++)
    {  row = P.row[i];
        if (row.stat == GLP_BS)
            continue;
        else if (row.stat == GLP_NL)
            row.prim = row.lb;
        else if (row.stat == GLP_NU)
            row.prim = row.ub;
        else if (row.stat == GLP_NF)
            row.prim = 0.0;
        else if (row.stat == GLP_NS)
            row.prim = row.lb;
        else
            xassert(row != row);
        /* N[j] is i-th column of matrix (I|-A) */
        work[i] -= row.prim;
    }
    for (j = 1; j <= P.n; j++)
    {  col = P.col[j];
        if (col.stat == GLP_BS)
            continue;
        else if (col.stat == GLP_NL)
            col.prim = col.lb;
        else if (col.stat == GLP_NU)
            col.prim = col.ub;
        else if (col.stat == GLP_NF)
            col.prim = 0.0;
        else if (col.stat == GLP_NS)
            col.prim = col.lb;
        else
            xassert(col != col);
        /* N[j] is (m+j)-th column of matrix (I|-A) */
        if (col.prim != 0.0)
        {  for (aij = col.ptr; aij != null; aij = aij.c_next)
            work[aij.row.i] += aij.val * col.prim;
        }
    }
    /* compute vector of basic variables xB = - inv(B) * N * xN */
    glp_ftran(P, work);
    /* store values of basic variables, check primal feasibility */
    P.pbs_stat = GLP_FEAS;
    for (i = 1; i <= P.m; i++)
    {  row = P.row[i];
        if (row.stat != GLP_BS)
            continue;
        row.prim = work[row.bind];
        type = row.type;
        if (type == GLP_LO || type == GLP_DB || type == GLP_FX)
        {  eps = 1e-6 + 1e-9 * Math.abs(row.lb);
            if (row.prim < row.lb - eps)
                P.pbs_stat = GLP_INFEAS;
        }
        if (type == GLP_UP || type == GLP_DB || type == GLP_FX)
        {  eps = 1e-6 + 1e-9 * Math.abs(row.ub);
            if (row.prim > row.ub + eps)
                P.pbs_stat = GLP_INFEAS;
        }
    }
    for (j = 1; j <= P.n; j++)
    {  col = P.col[j];
        if (col.stat != GLP_BS)
            continue;
        col.prim = work[col.bind];
        type = col.type;
        if (type == GLP_LO || type == GLP_DB || type == GLP_FX)
        {  eps = 1e-6 + 1e-9 * Math.abs(col.lb);
            if (col.prim < col.lb - eps)
                P.pbs_stat = GLP_INFEAS;
        }
        if (type == GLP_UP || type == GLP_DB || type == GLP_FX)
        {  eps = 1e-6 + 1e-9 * Math.abs(col.ub);
            if (col.prim > col.ub + eps)
                P.pbs_stat = GLP_INFEAS;
        }
    }
    /* compute value of the objective function */
    P.obj_val = P.c0;
    for (j = 1; j <= P.n; j++)
    {  col = P.col[j];
        P.obj_val += col.coef * col.prim;
    }
    /* build vector cB of objective coefficients at basic variables */
    for (i = 1; i <= P.m; i++)
        work[i] = 0.0;
    for (j = 1; j <= P.n; j++)
    {  col = P.col[j];
        if (col.stat == GLP_BS)
            work[col.bind] = col.coef;
    }
    /* compute vector of simplex multipliers pi = inv(B') * cB */
    glp_btran(P, work);
    /* compute and store reduced costs of non-basic variables d[j] =
     c[j] - N'[j] * pi, check dual feasibility */
    P.dbs_stat = GLP_FEAS;
    for (i = 1; i <= P.m; i++)
    {  row = P.row[i];
        if (row.stat == GLP_BS)
        {  row.dual = 0.0;
            continue;
        }
        /* N[j] is i-th column of matrix (I|-A) */
        row.dual = - work[i];
        type = row.type;
        temp = (P.dir == GLP_MIN ? + row.dual : - row.dual);
        if ((type == GLP_FR || type == GLP_LO) && temp < -1e-5 ||
            (type == GLP_FR || type == GLP_UP) && temp > +1e-5)
            P.dbs_stat = GLP_INFEAS;
    }
    for (j = 1; j <= P.n; j++)
    {  col = P.col[j];
        if (col.stat == GLP_BS)
        {  col.dual = 0.0;
            continue;
        }
        /* N[j] is (m+j)-th column of matrix (I|-A) */
        col.dual = col.coef;
        for (aij = col.ptr; aij != null; aij = aij.c_next)
            col.dual += aij.val * work[aij.row.i];
        type = col.type;
        temp = (P.dir == GLP_MIN ? + col.dual : - col.dual);
        if ((type == GLP_FR || type == GLP_LO) && temp < -1e-5 ||
            (type == GLP_FR || type == GLP_UP) && temp > +1e-5)
            P.dbs_stat = GLP_INFEAS;
    }
    /* free working array */
    return 0;
}

var glp_eval_tab_row = exports.glp_eval_tab_row = function(lp, k, ind, val){
    var m = lp.m;
    var n = lp.n;
    var i, t, len, lll, iii;
    var alfa, rho, vvv;
    if (!(m == 0 || lp.valid))
        xerror("glp_eval_tab_row: basis factorization does not exist");
    if (!(1 <= k && k <= m+n))
        xerror("glp_eval_tab_row: k = " + k + "; variable number out of range");
    /* determine xB[i] which corresponds to x[k] */
    if (k <= m)
        i = glp_get_row_bind(lp, k);
    else
        i = glp_get_col_bind(lp, k-m);
    if (i == 0)
        xerror("glp_eval_tab_row: k = " + k + "; variable must be basic");
    xassert(1 <= i && i <= m);
    /* allocate working arrays */
    rho = new Array(1+m);
    iii = new Array(1+m);
    vvv = new Array(1+m);
    /* compute i-th row of the inverse; see (8) */
    for (t = 1; t <= m; t++) rho[t] = 0.0;
    rho[i] = 1.0;
    glp_btran(lp, rho);
    /* compute i-th row of the simplex table */
    len = 0;
    for (k = 1; k <= m+n; k++)
    {  if (k <= m)
    {  /* x[k] is auxiliary variable, so N[k] is a unity column */
        if (glp_get_row_stat(lp, k) == GLP_BS) continue;
        /* compute alfa[i,j]; see (9) */
        alfa = - rho[k];
    }
    else
    {  /* x[k] is structural variable, so N[k] is a column of the
     original constraint matrix A with negative sign */
        if (glp_get_col_stat(lp, k-m) == GLP_BS) continue;
        /* compute alfa[i,j]; see (9) */
        lll = glp_get_mat_col(lp, k-m, iii, vvv);
        alfa = 0.0;
        for (t = 1; t <= lll; t++) alfa += rho[iii[t]] * vvv[t];
    }
        /* store alfa[i,j] */
        if (alfa != 0.0) {
            len++;
            ind[len] = k;
            val[len] = alfa;
        }
    }
    xassert(len <= n);
    /* return to the calling program */
    return len;
};

var glp_eval_tab_col = exports.glp_eval_tab_col = function(lp, k, ind, val){
    var m = lp.m;
    var n = lp.n;
    var t, len, stat;
    var col;
    if (!(m == 0 || lp.valid))
        xerror("glp_eval_tab_col: basis factorization does not exist");
    if (!(1 <= k && k <= m+n))
        xerror("glp_eval_tab_col: k = " + k + "; variable number out of range");
    if (k <= m)
        stat = glp_get_row_stat(lp, k);
    else
        stat = glp_get_col_stat(lp, k-m);
    if (stat == GLP_BS)
        xerror("glp_eval_tab_col: k = " + k + "; variable must be non-basic");
    /* obtain column N[k] with negative sign */
    col = new Array(1+m);
    for (t = 1; t <= m; t++) col[t] = 0.0;
    if (k <= m)
    {  /* x[k] is auxiliary variable, so N[k] is a unity column */
        col[k] = -1.0;
    }
    else
    {  /* x[k] is structural variable, so N[k] is a column of the
     original constraint matrix A with negative sign */
        len = glp_get_mat_col(lp, k-m, ind, val);
        for (t = 1; t <= len; t++) col[ind[t]] = val[t];
    }
    /* compute column of the simplex table, which corresponds to the
     specified non-basic variable x[k] */
    glp_ftran(lp, col);
    len = 0;
    for (t = 1; t <= m; t++)
    {  if (col[t] != 0.0)
    {  len++;
        ind[len] = glp_get_bhead(lp, t);
        val[len] = col[t];
    }
    }
    /* return to the calling program */
    return len;
};

var glp_transform_row = exports.glp_transform_row = function(P, len, ind, val){
    var i, j, k, m, n, t, lll, iii;
    var alfa, a, aB, rho, vvv;
    if (!glp_bf_exists(P))
        xerror("glp_transform_row: basis factorization does not exist ");
    m = glp_get_num_rows(P);
    n = glp_get_num_cols(P);
    /* unpack the row to be transformed to the array a */
    a = new Array(1+n);
    for (j = 1; j <= n; j++) a[j] = 0.0;
    if (!(0 <= len && len <= n))
        xerror("glp_transform_row: len = " + len + "; invalid row length");
    for (t = 1; t <= len; t++)
    {  j = ind[t];
        if (!(1 <= j && j <= n))
            xerror("glp_transform_row: ind[" + t + "] = " + j + "; column index out of range");
        if (val[t] == 0.0)
            xerror("glp_transform_row: val[" + t + "] = 0; zero coefficient not allowed");
        if (a[j] != 0.0)
            xerror("glp_transform_row: ind[" + t + "] = " + j + "; duplicate column indices not allowed");
        a[j] = val[t];
    }
    /* construct the vector aB */
    aB = new Array(1+m);
    for (i = 1; i <= m; i++)
    {  k = glp_get_bhead(P, i);
        /* xB[i] is k-th original variable */
        xassert(1 <= k && k <= m+n);
        aB[i] = (k <= m ? 0.0 : a[k-m]);
    }
    /* solve the system B'*rho = aB to compute the vector rho */
    rho = aB; glp_btran(P, rho);
    /* compute coefficients at non-basic auxiliary variables */
    len = 0;
    for (i = 1; i <= m; i++)
    {  if (glp_get_row_stat(P, i) != GLP_BS)
    {  alfa = - rho[i];
        if (alfa != 0.0)
        {  len++;
            ind[len] = i;
            val[len] = alfa;
        }
    }
    }
    /* compute coefficients at non-basic structural variables */
    iii = new Array(1+m);
    vvv = new Array(1+m);
    for (j = 1; j <= n; j++)
    {  if (glp_get_col_stat(P, j) != GLP_BS)
    {  alfa = a[j];
        lll = glp_get_mat_col(P, j, iii, vvv);
        for (t = 1; t <= lll; t++) alfa += vvv[t] * rho[iii[t]];
        if (alfa != 0.0)
        {  len++;
            ind[len] = m+j;
            val[len] = alfa;
        }
    }
    }
    xassert(len <= n);
    return len;
};

var glp_transform_col = exports.glp_transform_col = function(P, len, ind, val){
    var i, m, t;
    var a, alfa;
    if (!glp_bf_exists(P))
        xerror("glp_transform_col: basis factorization does not exist ");
    m = glp_get_num_rows(P);
    /* unpack the column to be transformed to the array a */
    a = new Array(1+m);
    for (i = 1; i <= m; i++) a[i] = 0.0;
    if (!(0 <= len && len <= m))
        xerror("glp_transform_col: len = " + len + "; invalid column length");
    for (t = 1; t <= len; t++)
    {  i = ind[t];
        if (!(1 <= i && i <= m))
            xerror("glp_transform_col: ind[" + t + "] = " + i + "; row index out of range");
        if (val[t] == 0.0)
            xerror("glp_transform_col: val[" + t + "] = 0; zero coefficient not allowed");
        if (a[i] != 0.0)
            xerror("glp_transform_col: ind[" + t + "] = " + i + "; duplicate row indices not allowed");
        a[i] = val[t];
    }
    /* solve the system B*a = alfa to compute the vector alfa */
    alfa = a; glp_ftran(P, alfa);
    /* store resultant coefficients */
    len = 0;
    for (i = 1; i <= m; i++)
    {  if (alfa[i] != 0.0)
    {  len++;
        ind[len] = glp_get_bhead(P, i);
        val[len] = alfa[i];
    }
    }
    return len;
};

var glp_prim_rtest = exports.glp_prim_rtest = function(P, len, ind, val, dir, eps){
    var k, m, n, piv, t, type, stat;
    var alfa, big, beta, lb, ub, temp, teta;
    if (glp_get_prim_stat(P) != GLP_FEAS)
        xerror("glp_prim_rtest: basic solution is not primal feasible ");
    if (!(dir == +1 || dir == -1))
        xerror("glp_prim_rtest: dir = " + dir + "; invalid parameter");
    if (!(0.0 < eps && eps < 1.0))
        xerror("glp_prim_rtest: eps = " + eps + "; invalid parameter");
    m = glp_get_num_rows(P);
    n = glp_get_num_cols(P);
    /* initial settings */
    piv = 0; teta = DBL_MAX; big = 0.0;
    /* walk through the entries of the specified column */
    for (t = 1; t <= len; t++)
    {  /* get the ordinal number of basic variable */
        k = ind[t];
        if (!(1 <= k && k <= m+n))
            xerror("glp_prim_rtest: ind[" + t + "] = " + k + "; variable number out of range");
        /* determine type, bounds, status and primal value of basic
         variable xB[i] = x[k] in the current basic solution */
        if (k <= m)
        {  type = glp_get_row_type(P, k);
            lb = glp_get_row_lb(P, k);
            ub = glp_get_row_ub(P, k);
            stat = glp_get_row_stat(P, k);
            beta = glp_get_row_prim(P, k);
        }
        else
        {  type = glp_get_col_type(P, k-m);
            lb = glp_get_col_lb(P, k-m);
            ub = glp_get_col_ub(P, k-m);
            stat = glp_get_col_stat(P, k-m);
            beta = glp_get_col_prim(P, k-m);
        }
        if (stat != GLP_BS)
            xerror("glp_prim_rtest: ind[" + t + "] = " + k + "; non-basic variable not allowed");
        /* determine influence coefficient at basic variable xB[i]
         in the explicitly specified column and turn to the case of
         increasing the variable x in order to simplify the program
         logic */
        alfa = (dir > 0 ? + val[t] : - val[t]);
        /* analyze main cases */
        if (type == GLP_FR)
        {  /* xB[i] is free variable */
            continue;
        }
        else if (type == GLP_LO)
        {  /* xB[i] has an lower bound */
            if (alfa > - eps) continue;
            temp = (lb - beta) / alfa;
        }
        else if (type == GLP_UP)
        {  /* xB[i] has an upper bound */
            if (alfa < + eps) continue;
            temp = (ub - beta) / alfa;
        }
        else if (type == GLP_DB)
        {  /* xB[i] has both lower and upper bounds */
            if (alfa < 0.0)
            {  /* xB[i] has an lower bound */
                if (alfa > - eps) continue;
                temp = (lb - beta) / alfa;
            } else {
                /* xB[i] has an upper bound */
                if (alfa < + eps) continue;
                temp = (ub - beta) / alfa;
            }
        }
        else if (type == GLP_FX)
        {  /* xB[i] is fixed variable */
            if (- eps < alfa && alfa < + eps) continue;
            temp = 0.0;
        }
        else
            xassert(type != type);
        /* if the value of the variable xB[i] violates its lower or
         upper bound (slightly, because the current basis is assumed
         to be primal feasible), temp is negative; we can think this
         happens due to round-off errors and the value is exactly on
         the bound; this allows replacing temp by zero */
        if (temp < 0.0) temp = 0.0;
        /* apply the minimal ratio test */
        if (teta > temp || teta == temp && big < Math.abs(alfa)){
            piv = t;
            teta = temp;
            big = Math.abs(alfa);
        }

    }
    /* return index of the pivot element chosen */
    return piv;
};

var glp_dual_rtest = exports.glp_dual_rtest = function(P, len, ind, val, dir, eps){
    var k, m, n, piv, t, stat;
    var alfa, big, cost, obj, temp, teta;
    if (glp_get_dual_stat(P) != GLP_FEAS)
        xerror("glp_dual_rtest: basic solution is not dual feasible");
    if (!(dir == +1 || dir == -1))
        xerror("glp_dual_rtest: dir = " + dir + "; invalid parameter");
    if (!(0.0 < eps && eps < 1.0))
        xerror("glp_dual_rtest: eps = " + eps + "; invalid parameter");
    m = glp_get_num_rows(P);
    n = glp_get_num_cols(P);
    /* take into account optimization direction */
    obj = (glp_get_obj_dir(P) == GLP_MIN ? +1.0 : -1.0);
    /* initial settings */
    piv = 0; teta = DBL_MAX; big = 0.0;
    /* walk through the entries of the specified row */
    for (t = 1; t <= len; t++)
    {  /* get ordinal number of non-basic variable */
        k = ind[t];
        if (!(1 <= k && k <= m+n))
            xerror("glp_dual_rtest: ind[" + t + "] = " + k + "; variable number out of range");
        /* determine status and reduced cost of non-basic variable
         x[k] = xN[j] in the current basic solution */
        if (k <= m)
        {  stat = glp_get_row_stat(P, k);
            cost = glp_get_row_dual(P, k);
        }
        else
        {  stat = glp_get_col_stat(P, k-m);
            cost = glp_get_col_dual(P, k-m);
        }
        if (stat == GLP_BS)
            xerror("glp_dual_rtest: ind[" + t + "] = " + k + "; basic variable not allowed");
        /* determine influence coefficient at non-basic variable xN[j]
         in the explicitly specified row and turn to the case of
         increasing the variable x in order to simplify the program
         logic */
        alfa = (dir > 0 ? + val[t] : - val[t]);
        /* analyze main cases */
        if (stat == GLP_NL)
        {  /* xN[j] is on its lower bound */
            if (alfa < + eps) continue;
            temp = (obj * cost) / alfa;
        }
        else if (stat == GLP_NU)
        {  /* xN[j] is on its upper bound */
            if (alfa > - eps) continue;
            temp = (obj * cost) / alfa;
        }
        else if (stat == GLP_NF)
        {  /* xN[j] is non-basic free variable */
            if (- eps < alfa && alfa < + eps) continue;
            temp = 0.0;
        }
        else if (stat == GLP_NS)
        {  /* xN[j] is non-basic fixed variable */
            continue;
        }
        else
            xassert(stat != stat);
        /* if the reduced cost of the variable xN[j] violates its zero
         bound (slightly, because the current basis is assumed to be
         dual feasible), temp is negative; we can think this happens
         due to round-off errors and the reduced cost is exact zero;
         this allows replacing temp by zero */
        if (temp < 0.0) temp = 0.0;
        /* apply the minimal ratio test */
        if (teta > temp || teta == temp && big < Math.abs(alfa)){
            piv = t;
            teta = temp;
            big = Math.abs(alfa);
        }
    }
    /* return index of the pivot element chosen */
    return piv;
};

function _glp_analyze_row(P, len, ind, val, type, rhs, eps, callback){
    var t, k, dir, piv, ret = 0;
    var x, dx, y, dy, dz;
    if (P.pbs_stat == GLP_UNDEF)
        xerror("glp_analyze_row: primal basic solution components are undefined");
    if (P.dbs_stat != GLP_FEAS)
        xerror("glp_analyze_row: basic solution is not dual feasible");
    /* compute the row value y = sum alfa[j] * xN[j] in the current
     basis */
    if (!(0 <= len && len <= P.n))
        xerror("glp_analyze_row: len = " + len + "; invalid row length");
    y = 0.0;
    for (t = 1; t <= len; t++)
    {  /* determine value of x[k] = xN[j] in the current basis */
        k = ind[t];
        if (!(1 <= k && k <= P.m+P.n))
            xerror("glp_analyze_row: ind[" + t + "] = " + k + "; row/column index out of range");
        if (k <= P.m)
        {  /* x[k] is auxiliary variable */
            if (P.row[k].stat == GLP_BS)
                xerror("glp_analyze_row: ind[" + t + "] = " + k + "; basic auxiliary variable is not allowed");
            x = P.row[k].prim;
        }
        else
        {  /* x[k] is structural variable */
            if (P.col[k-P.m].stat == GLP_BS)
                xerror("glp_analyze_row: ind[" + t + "] = " + k + "; basic structural variable is not allowed");
            x = P.col[k-P.m].prim;
        }
        y += val[t] * x;
    }
    /* check if the row is primal infeasible in the current basis,
     i.e. the constraint is violated at the current point */
    if (type == GLP_LO)
    {  if (y >= rhs)
    {  /* the constraint is not violated */
        ret = 1;
        return ret;
    }
        /* in the adjacent basis y goes to its lower bound */
        dir = +1;
    }
    else if (type == GLP_UP)
    {  if (y <= rhs)
    {  /* the constraint is not violated */
        ret = 1;
        return ret;
    }
        /* in the adjacent basis y goes to its upper bound */
        dir = -1;
    }
    else
        xerror("glp_analyze_row: type = " + type + "; invalid parameter");
    /* compute dy = y.new - y.old */
    dy = rhs - y;
    /* perform dual ratio test to determine which non-basic variable
     should enter the adjacent basis to keep it dual feasible */
    piv = glp_dual_rtest(P, len, ind, val, dir, eps);
    if (piv == 0)
    {  /* no dual feasible adjacent basis exists */
        ret = 2;
        return ret;
    }
    /* non-basic variable x[k] = xN[j] should enter the basis */
    k = ind[piv];
    xassert(1 <= k && k <= P.m+P.n);
    /* determine its value in the current basis */
    if (k <= P.m)
        x = P.row[k].prim;
    else
        x = P.col[k-P.m].prim;
    /* compute dx = x.new - x.old = dy / alfa[j] */
    xassert(val[piv] != 0.0);
    dx = dy / val[piv];
    /* compute dz = z.new - z.old = d[j] * dx, where d[j] is reduced
     cost of xN[j] in the current basis */
    if (k <= P.m)
        dz = P.row[k].dual * dx;
    else
        dz = P.col[k-P.m].dual * dx;
    /* store the analysis results */

    callback(piv, x, dx, y, dy, dz);
    return ret;
}

var glp_analyze_bound = exports.glp_analyze_bound = function(P, k, callback){
    var row;
    var col;
    var  m, n, stat, kase, p, len, piv, ind;
    var  x, new_x, ll, uu, xx, delta, val;
    var value1, var1, value2, var2;
    value1 = var1 = value2 = var2 = null;

    function store(){
        /* store analysis results */
        if (kase < 0)
        {  value1 = new_x;
            var1 = p;
        }
        else
        {  value2 = new_x;
            var2 = p;
        }
    }

    /* sanity checks */
    if (P == null || P.magic != GLP_PROB_MAGIC)
        xerror("glp_analyze_bound: P = " + P + "; invalid problem object");
    m = P.m; n = P.n;
    if (!(P.pbs_stat == GLP_FEAS && P.dbs_stat == GLP_FEAS))
        xerror("glp_analyze_bound: optimal basic solution required");
    if (!(m == 0 || P.valid))
        xerror("glp_analyze_bound: basis factorization required");
    if (!(1 <= k && k <= m+n))
        xerror("glp_analyze_bound: k = " + k + "; variable number out of range");
    /* retrieve information about the specified non-basic variable
     x[k] whose active bound is to be analyzed */
    if (k <= m)
    {  row = P.row[k];
        stat = row.stat;
        x = row.prim;
    }
    else
    {  col = P.col[k-m];
        stat = col.stat;
        x = col.prim;
    }
    if (stat == GLP_BS)
        xerror("glp_analyze_bound: k = " + k + "; basic variable not allowed ");
    /* allocate working arrays */
    ind = new Array(1+m);
    val = new Array(1+m);
    /* compute column of the simplex table corresponding to the
     non-basic variable x[k] */
    len = glp_eval_tab_col(P, k, ind, val);
    xassert(0 <= len && len <= m);
    /* perform analysis */
    for (kase = -1; kase <= +1; kase += 2)
    {  /* kase < 0 means active bound of x[k] is decreasing;
     kase > 0 means active bound of x[k] is increasing */
        /* use the primal ratio test to determine some basic variable
         x[p] which reaches its bound first */
        piv = glp_prim_rtest(P, len, ind, val, kase, 1e-9);
        if (piv == 0)
        {  /* nothing limits changing the active bound of x[k] */
            p = 0;
            new_x = (kase < 0 ? -DBL_MAX : +DBL_MAX);
            store();
            continue;
        }
        /* basic variable x[p] limits changing the active bound of
         x[k]; determine its value in the current basis */
        xassert(1 <= piv && piv <= len);
        p = ind[piv];
        if (p <= m)
        {  row = P.row[p];
            ll = glp_get_row_lb(P, row.i);
            uu = glp_get_row_ub(P, row.i);
            stat = row.stat;
            xx = row.prim;
        }
        else
        {  col = P.col[p-m];
            ll = glp_get_col_lb(P, col.j);
            uu = glp_get_col_ub(P, col.j);
            stat = col.stat;
            xx = col.prim;
        }
        xassert(stat == GLP_BS);
        /* determine delta x[p] = bound of x[p] - value of x[p] */
        if (kase < 0 && val[piv] > 0.0 ||
            kase > 0 && val[piv] < 0.0)
        {  /* delta x[p] < 0, so x[p] goes toward its lower bound */
            xassert(ll != -DBL_MAX);
            delta = ll - xx;
        }
        else
        {  /* delta x[p] > 0, so x[p] goes toward its upper bound */
            xassert(uu != +DBL_MAX);
            delta = uu - xx;
        }
        /* delta x[p] = alfa[p,k] * delta x[k], so new x[k] = x[k] +
         delta x[k] = x[k] + delta x[p] / alfa[p,k] is the value of
         x[k] in the adjacent basis */
        xassert(val[piv] != 0.0);
        new_x = x + delta / val[piv];
        store();
    }
    callback(value1, var1, value2, var2)
};

var glp_analyze_coef = exports.glp_analyze_coef = function(P, k, out){
    var row, col;
    var m, n, type, stat, kase, p, q, dir, clen, cpiv, rlen, rpiv, cind, rind;
    var lb, ub, coef, x, lim_coef, new_x, d, delta, ll, uu, xx, rval, cval;
    var coef1 = null, var1 = null, value1 = null, coef2 = null, var2 = null, value2 = null;

    function store(){
        /* store analysis results */
        if (kase < 0)
        {   coef1 = lim_coef;
            var1 = q;
            value1 = new_x;
        }
        else
        {   coef2 = lim_coef;
            var2 = q;
            value2 = new_x;
        }
    }

    /* sanity checks */
    if (P == null || P.magic != GLP_PROB_MAGIC)
        xerror("glp_analyze_coef: P = " + P + "; invalid problem object");
    m = P.m;
    n = P.n;
    if (!(P.pbs_stat == GLP_FEAS && P.dbs_stat == GLP_FEAS))
        xerror("glp_analyze_coef: optimal basic solution required");
    if (!(m == 0 || P.valid))
        xerror("glp_analyze_coef: basis factorization required");
    if (!(1 <= k && k <= m+n))
        xerror("glp_analyze_coef: k = " + k + "; variable number out of range");
    /* retrieve information about the specified basic variable x[k]
     whose objective coefficient c[k] is to be analyzed */
    if (k <= m)
    {  row = P.row[k];
        type = row.type;
        lb = row.lb;
        ub = row.ub;
        coef = 0.0;
        stat = row.stat;
        x = row.prim;
    }
    else
    {  col = P.col[k-m];
        type = col.type;
        lb = col.lb;
        ub = col.ub;
        coef = col.coef;
        stat = col.stat;
        x = col.prim;
    }
    if (stat != GLP_BS)
        xerror("glp_analyze_coef: k = " + k + "; non-basic variable not allowed");
    /* allocate working arrays */
    cind = new Array(1+m);
    cval = new Array(1+m);
    rind = new Array(1+n);
    rval = new Array(1+n);
    /* compute row of the simplex table corresponding to the basic
     variable x[k] */
    rlen = glp_eval_tab_row(P, k, rind, rval);
    xassert(0 <= rlen && rlen <= n);
    /* perform analysis */
    for (kase = -1; kase <= +1; kase += 2)
    {  /* kase < 0 means objective coefficient c[k] is decreasing;
     kase > 0 means objective coefficient c[k] is increasing */
        /* note that decreasing c[k] is equivalent to increasing dual
         variable lambda[k] and vice versa; we need to correctly set
         the dir flag as required by the routine glp_dual_rtest */
        if (P.dir == GLP_MIN)
            dir = - kase;
        else if (P.dir == GLP_MAX)
            dir = + kase;
        else
            xassert(P != P);
        /* use the dual ratio test to determine non-basic variable
         x[q] whose reduced cost d[q] reaches zero bound first */
        rpiv = glp_dual_rtest(P, rlen, rind, rval, dir, 1e-9);
        if (rpiv == 0)
        {  /* nothing limits changing c[k] */
            lim_coef = (kase < 0 ? -DBL_MAX : +DBL_MAX);
            q = 0;
            /* x[k] keeps its current value */
            new_x = x;
            store();
            continue;
        }
        /* non-basic variable x[q] limits changing coefficient c[k];
         determine its status and reduced cost d[k] in the current
         basis */
        xassert(1 <= rpiv && rpiv <= rlen);
        q = rind[rpiv];
        xassert(1 <= q && q <= m+n);
        if (q <= m)
        {  row = P.row[q];
            stat = row.stat;
            d = row.dual;
        }
        else
        {  col = P.col[q-m];
            stat = col.stat;
            d = col.dual;
        }
        /* note that delta d[q] = new d[q] - d[q] = - d[q], because
         new d[q] = 0; delta d[q] = alfa[k,q] * delta c[k], so
         delta c[k] = delta d[q] / alfa[k,q] = - d[q] / alfa[k,q] */
        xassert(rval[rpiv] != 0.0);
        delta = - d / rval[rpiv];
        /* compute new c[k] = c[k] + delta c[k], which is the limiting
         value of the objective coefficient c[k] */
        lim_coef = coef + delta;
        /* let c[k] continue decreasing/increasing that makes d[q]
         dual infeasible and forces x[q] to enter the basis;
         to perform the primal ratio test we need to know in which
         direction x[q] changes on entering the basis; we determine
         that analyzing the sign of delta d[q] (see above), since
         d[q] may be close to zero having wrong sign */
        /* let, for simplicity, the problem is minimization */
        if (kase < 0 && rval[rpiv] > 0.0 ||
            kase > 0 && rval[rpiv] < 0.0)
        {  /* delta d[q] < 0, so d[q] being non-negative will become
         negative, so x[q] will increase */
            dir = +1;
        }
        else
        {  /* delta d[q] > 0, so d[q] being non-positive will become
         positive, so x[q] will decrease */
            dir = -1;
        }
        /* if the problem is maximization, correct the direction */
        if (P.dir == GLP_MAX) dir = - dir;
        /* check that we didn't make a silly mistake */
        if (dir > 0)
            xassert(stat == GLP_NL || stat == GLP_NF);
        else
            xassert(stat == GLP_NU || stat == GLP_NF);
        /* compute column of the simplex table corresponding to the
         non-basic variable x[q] */
        clen = glp_eval_tab_col(P, q, cind, cval);
        /* make x[k] temporarily free (unbounded) */
        if (k <= m)
        {  row = P.row[k];
            row.type = GLP_FR;
            row.lb = row.ub = 0.0;
        }
        else
        {  col = P.col[k-m];
            col.type = GLP_FR;
            col.lb = col.ub = 0.0;
        }
        /* use the primal ratio test to determine some basic variable
         which leaves the basis */
        cpiv = glp_prim_rtest(P, clen, cind, cval, dir, 1e-9);
        /* restore original bounds of the basic variable x[k] */
        if (k <= m)
        {  row = P.row[k];
            row.type = type;
            row.lb = lb;
            row.ub = ub;
        }
        else
        {  col = P.col[k-m];
            col.type = type;
            col.lb = lb;
            col.ub = ub;
        }
        if (cpiv == 0)
        {  /* non-basic variable x[q] can change unlimitedly */
            if (dir < 0 && rval[rpiv] > 0.0 ||
                dir > 0 && rval[rpiv] < 0.0)
            {  /* delta x[k] = alfa[k,q] * delta x[q] < 0 */
                new_x = -DBL_MAX;
            }
            else
            {  /* delta x[k] = alfa[k,q] * delta x[q] > 0 */
                new_x = +DBL_MAX;
            }
            store();
            continue;
        }
        /* some basic variable x[p] limits changing non-basic variable
         x[q] in the adjacent basis */
        xassert(1 <= cpiv && cpiv <= clen);
        p = cind[cpiv];
        xassert(1 <= p && p <= m+n);
        xassert(p != k);
        if (p <= m)
        {  row = P.row[p];
            xassert(row.stat == GLP_BS);
            ll = glp_get_row_lb(P, row.i);
            uu = glp_get_row_ub(P, row.i);
            xx = row.prim;
        }
        else
        {  col = P.col[p-m];
            xassert(col.stat == GLP_BS);
            ll = glp_get_col_lb(P, col.j);
            uu = glp_get_col_ub(P, col.j);
            xx = col.prim;
        }
        /* determine delta x[p] = new x[p] - x[p] */
        if (dir < 0 && cval[cpiv] > 0.0 ||
            dir > 0 && cval[cpiv] < 0.0)
        {  /* delta x[p] < 0, so x[p] goes toward its lower bound */
            xassert(ll != -DBL_MAX);
            delta = ll - xx;
        }
        else
        {  /* delta x[p] > 0, so x[p] goes toward its upper bound */
            xassert(uu != +DBL_MAX);
            delta = uu - xx;
        }
        /* compute new x[k] = x[k] + alfa[k,q] * delta x[q], where
         delta x[q] = delta x[p] / alfa[p,q] */
        xassert(cval[cpiv] != 0.0);
        new_x = x + (rval[rpiv] / cval[cpiv]) * delta;
        store();
    }
    callback(coef1, var1, value1, coef2, var2, value2)
};

function glp_ios_reason(tree){
    return tree.reason;
}

function glp_ios_get_prob(tree){
    return tree.mip;
}

function glp_ios_tree_size(tree, callback){
    callback(tree.a_cnt, tree.n_cnt, tree.t_cnt);
}

function glp_ios_curr_node(tree){
    /* obtain pointer to the current subproblem */
    var node = tree.curr;
    /* return its reference number */
    return node == null ? 0 : node.p;
}

function glp_ios_next_node(tree, p){

    function doError(){
        xerror("glp_ios_next_node: p = " + p + "; invalid subproblem reference number");
    }

    var node;
    if (p == 0)
    {  /* obtain pointer to the first active subproblem */
        node = tree.head;
    }
    else
    {  /* obtain pointer to the specified subproblem */
        if (!(1 <= p && p <= tree.nslots))
            doError();
        node = tree.slot[p].node;
        if (node == null) doError();
        /* the specified subproblem must be active */
        if (node.count != 0)
            xerror("glp_ios_next_node: p = " + p + "; subproblem not in the active list");
        /* obtain pointer to the next active subproblem */
        node = node.next;
    }
    /* return the reference number */
    return node == null ? 0 : node.p;
}

function glp_ios_prev_node(tree, p){
    var node;

    function doError(){
        xerror("glp_ios_prev_node: p = " + p + "; invalid subproblem reference number")
    }

    if (p == 0)
    {  /* obtain pointer to the last active subproblem */
        node = tree.tail;
    }
    else
    {  /* obtain pointer to the specified subproblem */
        if (!(1 <= p && p <= tree.nslots))
            doError();
        node = tree.slot[p].node;
        if (node == null) doError();
        /* the specified subproblem must be active */
        if (node.count != 0)
            xerror("glp_ios_prev_node: p = " + p + "; subproblem not in the active list");
        /* obtain pointer to the previous active subproblem */
        node = node.prev;
    }
    /* return the reference number */
    return node == null ? 0 : node.p;
}

function glp_ios_up_node(tree, p){
    var node;

    function doError(){
        xerror("glp_ios_up_node: p = " + p + "; invalid subproblem reference number")
    }

    /* obtain pointer to the specified subproblem */
    if (!(1 <= p && p <= tree.nslots))
        doError();
    node = tree.slot[p].node;
    if (node == null) doError();
    /* obtain pointer to the parent subproblem */
    node = node.up;
    /* return the reference number */
    return node == null ? 0 : node.p;
}

function glp_ios_node_level(tree, p){
    var node;

    function doError(){
        xerror("glp_ios_node_level: p = " + p + "; invalid subproblem reference number")
    }

    /* obtain pointer to the specified subproblem */
    if (!(1 <= p && p <= tree.nslots))
        doError();
    node = tree.slot[p].node;
    if (node == null) doError();
    /* return the node level */
    return node.level;
}

function glp_ios_node_bound(tree, p){
    var node;

    function doError(){
        xerror("glp_ios_node_bound: p = " + p + "; invalid subproblem reference number")
    }

    /* obtain pointer to the specified subproblem */
    if (!(1 <= p && p <= tree.nslots))
        doError();
    node = tree.slot[p].node;
    if (node == null) doError();
    /* return the node local bound */
    return node.bound;
}

function glp_ios_best_node(tree){
    return ios_best_node(tree);
}

function glp_ios_mip_gap(tree){
    return ios_relative_gap(tree);
}

function glp_ios_node_data(tree, p)
{
    var node;

    function doError(){
        xerror("glp_ios_node_level: p = " + p + "; invalid subproblem reference number")
    }

    /* obtain pointer to the specified subproblem */
    if (!(1 <= p && p <= tree.nslots))
        doError();
    node = tree.slot[p].node;
    if (node == null) doError();
    /* return pointer to the application-specific data */
    return node.data;
}

function glp_ios_row_attr(tree, i, attr){
    var row;
    if (!(1 <= i && i <= tree.mip.m))
        xerror("glp_ios_row_attr: i = " + i + "; row number out of range");
    row = tree.mip.row[i];
    attr.level = row.level;
    attr.origin = row.origin;
    attr.klass = row.klass;
}

function glp_ios_pool_size(tree){
    /* determine current size of the cut pool */
    if (tree.reason != GLP_ICUTGEN)
        xerror("glp_ios_pool_size: operation not allowed");
    xassert(tree.local != null);
    return tree.local.size;
}

function glp_ios_add_row(tree, name, klass, flags, len, ind, val, type, rhs){
    /* add row (constraint) to the cut pool */
    var num;
    if (tree.reason != GLP_ICUTGEN)
        xerror("glp_ios_add_row: operation not allowed");
    xassert(tree.local != null);
    num = ios_add_row(tree, tree.local, name, klass, flags, len,
        ind, val, type, rhs);
    return num;
}

function glp_ios_del_row(tree, i){
    /* remove row (constraint) from the cut pool */
    if (tree.reason != GLP_ICUTGEN)
        xerror("glp_ios_del_row: operation not allowed");
    ios_del_row(tree.local, i);
}

function glp_ios_clear_pool(tree){
    /* remove all rows (constraints) from the cut pool */
    if (tree.reason != GLP_ICUTGEN)
        xerror("glp_ios_clear_pool: operation not allowed");
    ios_clear_pool(tree.local);
}

function glp_ios_can_branch(tree, j){
    if (!(1 <= j && j <= tree.mip.n))
        xerror("glp_ios_can_branch: j = " + j + "; column number out of range");
    return tree.non_int[j];
}

function glp_ios_branch_upon(tree, j, sel){
    if (!(1 <= j && j <= tree.mip.n))
        xerror("glp_ios_branch_upon: j = " + j + "; column number out of range");
    if (!(sel == GLP_DN_BRNCH || sel == GLP_UP_BRNCH || sel == GLP_NO_BRNCH))
        xerror("glp_ios_branch_upon: sel = " + sel + ": invalid branch selection flag");
    if (!(tree.non_int[j]))
        xerror("glp_ios_branch_upon: j = " + j + "; variable cannot be used to branch upon");
    if (tree.br_var != 0)
        xerror("glp_ios_branch_upon: branching variable already chosen");
    tree.br_var = j;
    tree.br_sel = sel;
}

function glp_ios_select_node(tree, p){
    var node;

    function doError(){
        xerror("glp_ios_select_node: p = " + p + "; invalid subproblem reference number")
    }

    /* obtain pointer to the specified subproblem */
    if (!(1 <= p && p <= tree.nslots))
        doError();
    node = tree.slot[p].node;
    if (node == null) doError();
    /* the specified subproblem must be active */
    if (node.count != 0)
        xerror("glp_ios_select_node: p = " + p + "; subproblem not in the active list");
    /* no subproblem must be selected yet */
    if (tree.next_p != 0)
        xerror("glp_ios_select_node: subproblem already selected");
    /* select the specified subproblem to continue the search */
    tree.next_p = p;
}

function glp_ios_heur_sol(tree, x){
    var mip = tree.mip;
    var m = tree.orig_m;
    var n = tree.n;
    var i, j;
    var obj;
    xassert(mip.m >= m);
    xassert(mip.n == n);
    /* check values of integer variables and compute value of the
     objective function */
    obj = mip.c0;
    for (j = 1; j <= n; j++)
    {  var col = mip.col[j];
        if (col.kind == GLP_IV)
        {  /* provided value must be integral */
            if (x[j] != Math.floor(x[j])) return 1;
        }
        obj += col.coef * x[j];
    }
    /* check if the provided solution is better than the best known
     integer feasible solution */
    if (mip.mip_stat == GLP_FEAS)
    {  switch (mip.dir)
    {  case GLP_MIN:
            if (obj >= tree.mip.mip_obj) return 1;
            break;
        case GLP_MAX:
            if (obj <= tree.mip.mip_obj) return 1;
            break;
        default:
            xassert(mip != mip);
    }
    }
    /* it is better; store it in the problem object */
    if (tree.parm.msg_lev >= GLP_MSG_ON)
        xprintf("Solution found by heuristic: " + obj + "");
    mip.mip_stat = GLP_FEAS;
    mip.mip_obj = obj;
    for (j = 1; j <= n; j++)
        mip.col[j].mipx = x[j];
    for (i = 1; i <= m; i++)
    {  var row = mip.row[i];
        var aij;
        row.mipx = 0.0;
        for (aij = row.ptr; aij != null; aij = aij.r_next)
            row.mipx += aij.val * aij.col.mipx;
    }
    return 0;
}

function glp_ios_terminate(tree){
    if (tree.parm.msg_lev >= GLP_MSG_DBG)
        xprintf("The search is prematurely terminated due to application request");
    tree.stop = 1;
}

/* return codes: */
const
    BFD_ESING   = 1,  /* singular matrix */
    BFD_ECOND   = 2,  /* ill-conditioned matrix */
    BFD_ECHECK  = 3,  /* insufficient accuracy */
    BFD_ELIMIT  = 4,  /* update limit reached */
    BFD_EROOM   = 5;  /* SVA overflow */

function bfd_create_it(){
    var bfd = {};
    bfd.valid = 0;
    bfd.type = GLP_BF_FT;
    bfd.fhv = null;
    bfd.lpf = null;
    bfd.lu_size = 0;
    bfd.piv_tol = 0.10;
    bfd.piv_lim = 4;
    bfd.suhl = 1;
    bfd.eps_tol = 1e-15;
    bfd.max_gro = 1e+10;
    bfd.nfs_max = 100;
    bfd.upd_tol = 1e-6;
    bfd.nrs_max = 100;
    bfd.rs_size = 1000;
    bfd.upd_lim = -1;
    bfd.upd_cnt = 0;
    return bfd;
}

function bfd_set_parm(bfd, parm){
    /* change LP basis factorization control parameters */
    xassert(bfd != null);
    bfd.type = parm.type;
    bfd.lu_size = parm.lu_size;
    bfd.piv_tol = parm.piv_tol;
    bfd.piv_lim = parm.piv_lim;
    bfd.suhl = parm.suhl;
    bfd.eps_tol = parm.eps_tol;
    bfd.max_gro = parm.max_gro;
    bfd.nfs_max = parm.nfs_max;
    bfd.upd_tol = parm.upd_tol;
    bfd.nrs_max = parm.nrs_max;
    bfd.rs_size = parm.rs_size;
}

function bfd_factorize(bfd, m, bh, col, info){
    var luf;
    var nov, ret;
    xassert(bfd != null);
    xassert(1 <= m && m <= M_MAX);
    /* invalidate the factorization */
    bfd.valid = 0;
    /* create the factorization, if necessary */
    nov = 0;
    switch (bfd.type)
    {  case GLP_BF_FT:
        bfd.lpf = null;
        if (bfd.fhv == null){
            bfd.fhv = fhv_create_it(); nov = 1;
        }
        break;
        case GLP_BF_BG:
        case GLP_BF_GR:
            bfd.fhv = null;
            if (bfd.lpf == null){
                bfd.lpf = lpf_create_it(); nov = 1;
            }
            break;
        default:
            xassert(bfd != bfd);
    }
    /* set control parameters specific to LUF */
    if (bfd.fhv != null)
        luf = bfd.fhv.luf;
    else if (bfd.lpf != null)
        luf = bfd.lpf.luf;
    else
        xassert(bfd != bfd);
    if (nov) luf.new_sva = bfd.lu_size;
    luf.piv_tol = bfd.piv_tol;
    luf.piv_lim = bfd.piv_lim;
    luf.suhl = bfd.suhl;
    luf.eps_tol = bfd.eps_tol;
    luf.max_gro = bfd.max_gro;
    /* set control parameters specific to FHV */
    if (bfd.fhv != null)
    {  if (nov) bfd.fhv.hh_max = bfd.nfs_max;
        bfd.fhv.upd_tol = bfd.upd_tol;
    }
    /* set control parameters specific to LPF */
    if (bfd.lpf != null)
    {  if (nov) bfd.lpf.n_max = bfd.nrs_max;
        if (nov) bfd.lpf.v_size = bfd.rs_size;
    }
    /* try to factorize the basis matrix */
    if (bfd.fhv != null)
    {  switch (fhv_factorize(bfd.fhv, m, col, info))
    {  case 0:
            break;
        case FHV_ESING:
            ret = BFD_ESING;
            return ret;
        case FHV_ECOND:
            ret = BFD_ECOND;
            return ret;
        default:
            xassert(bfd != bfd);
    }
    }
    else if (bfd.lpf != null)
    {  switch (lpf_factorize(bfd.lpf, m, bh, col, info))
    {  case 0:
            /* set the Schur complement update type */
            switch (bfd.type)
            {  case GLP_BF_BG:
                /* Bartels-Golub update */
                bfd.lpf.scf.t_opt = SCF_TBG;
                break;
                case GLP_BF_GR:
                    /* Givens rotation update */
                    bfd.lpf.scf.t_opt = SCF_TGR;
                    break;
                default:
                    xassert(bfd != bfd);
            }
            break;
        case LPF_ESING:
            ret = BFD_ESING;
            return ret;
        case LPF_ECOND:
            ret = BFD_ECOND;
            return ret;
        default:
            xassert(bfd != bfd);
    }
    }
    else
        xassert(bfd != bfd);
    /* the basis matrix has been successfully factorized */
    bfd.valid = 1;
    bfd.upd_cnt = 0;
    ret = 0;
    /* return to the calling program */
    return ret;
}

function bfd_ftran(bfd, x){
    xassert(bfd != null);
    xassert(bfd.valid);
    if (bfd.fhv != null)
        fhv_ftran(bfd.fhv, x);
    else if (bfd.lpf != null)
        lpf_ftran(bfd.lpf, x);
    else
        xassert(bfd != bfd);
}

function bfd_btran(bfd, x){
    xassert(bfd != null);
    xassert(bfd.valid);
    if (bfd.fhv != null)
        fhv_btran(bfd.fhv, x);
    else if (bfd.lpf != null)
        lpf_btran(bfd.lpf, x);
    else
        xassert(bfd != bfd);
}

function bfd_update_it(bfd, j, bh, len, ind, idx, val){
    var ret;
    xassert(bfd != null);
    xassert(bfd.valid);
    /* try to update the factorization */
    if (bfd.fhv != null)
    {  switch (fhv_update_it(bfd.fhv, j, len, ind, idx, val))
    {  case 0:
            break;
        case FHV_ESING:
            bfd.valid = 0;
            ret = BFD_ESING;
            return ret;
        case FHV_ECHECK:
            bfd.valid = 0;
            ret = BFD_ECHECK;
            return ret;
        case FHV_ELIMIT:
            bfd.valid = 0;
            ret = BFD_ELIMIT;
            return ret;
        case FHV_EROOM:
            bfd.valid = 0;
            ret = BFD_EROOM;
            return ret;
        default:
            xassert(bfd != bfd);
    }
    }
    else if (bfd.lpf != null)
    {  switch (lpf_update_it(bfd.lpf, j, bh, len, ind, idx, val))
    {  case 0:
            break;
        case LPF_ESING:
            bfd.valid = 0;
            ret = BFD_ESING;
            return ret;
        case LPF_ELIMIT:
            bfd.valid = 0;
            ret = BFD_ELIMIT;
            return ret;
        default:
            xassert(bfd != bfd);
    }
    }
    else
        xassert(bfd != bfd);
    /* the factorization has been successfully updated */
    /* increase the update count */
    bfd.upd_cnt++;
    ret = 0;
    /* return to the calling program */
    return ret;
}

function bfd_get_count(bfd){
    /* determine factorization update count */
    xassert(bfd != null);
    xassert(bfd.valid);
    return bfd.upd_cnt;
}

function check_parm(func, parm){
    /* check control parameters */
    xassert(func != null);
    xassert(parm != null);
}

const CHAR_SET = "!\"#$%&()/,.;?@_`'{}|~";
/* characters, which may appear in symbolic names */

var glp_read_lp = exports.glp_read_lp = function(P, parm, callback){
    const
        T_EOF        = 0x00,  /* end of file */
        T_MINIMIZE   = 0x01,  /* keyword 'minimize' */
        T_MAXIMIZE   = 0x02,  /* keyword 'maximize' */
        T_SUBJECT_TO = 0x03,  /* keyword 'subject to' */
        T_BOUNDS     = 0x04,  /* keyword 'bounds' */
        T_GENERAL    = 0x05,  /* keyword 'general' */
        T_INTEGER    = 0x06,  /* keyword 'integer' */
        T_BINARY     = 0x07,  /* keyword 'binary' */
        T_END        = 0x08,  /* keyword 'end' */
        T_NAME       = 0x09,  /* symbolic name */
        T_NUMBER     = 0x0A,  /* numeric constant */
        T_PLUS       = 0x0B,  /* delimiter '+' */
        T_MINUS      = 0x0C,  /* delimiter '-' */
        T_COLON      = 0x0D,  /* delimiter ':' */
        T_LE         = 0x0E,  /* delimiter '<=' */
        T_GE         = 0x0F,  /* delimiter '>=' */
        T_EQ         = 0x10;  /* delimiter '=' */

    function error(csa, fmt){
        /* print error message and terminate processing */
        throw new Error(csa.count + ": " + fmt);
    }

    function warning(csa, fmt)
    {     /* print warning message and continue processing */
        xprintf(csa.count + ": warning: " + fmt);
    }

    function read_char(csa){
        /* read next character from input file */
        var c;
        xassert(csa.c != XEOF);
        if (csa.c == '\n') csa.count++;
        c = csa.callback();
        if (c < 0)
        {
            if (csa.c == '\n')
            {  csa.count--;
                c = XEOF;
            }
            else
            {  warning(csa, "missing final end of line");
                c = '\n';
            }
        }
        else if (c == '\n'){

        }
        else if (isspace(c))
            c = ' ';
        else if (iscntrl(c))
            error(csa, "invalid control character " + c.charCodeAt(0));
        csa.c = c;
    }

    function add_char(csa){
        /* append current character to current token */
        csa.image += csa.c;
        read_char(csa);
    }

    function the_same(s1, s2)
    {
        /* compare two character strings ignoring case sensitivity */
        return (s1.toLowerCase() == s2.toLowerCase())?1:0;
    }

    function scan_token(csa){
        /* scan next token */
        var flag;
        csa.token = -1;
        csa.image = "";
        csa.value = 0.0;


        function name(){  /* symbolic name */
            csa.token = T_NAME;
            while (isalnum(csa.c) || strchr(CHAR_SET, csa.c) >= 0)
                add_char(csa);
            if (flag)
            {  /* check for keyword */
                if (the_same(csa.image, "minimize"))
                    csa.token = T_MINIMIZE;
                else if (the_same(csa.image, "minimum"))
                    csa.token = T_MINIMIZE;
                else if (the_same(csa.image, "min"))
                    csa.token = T_MINIMIZE;
                else if (the_same(csa.image, "maximize"))
                    csa.token = T_MAXIMIZE;
                else if (the_same(csa.image, "maximum"))
                    csa.token = T_MAXIMIZE;
                else if (the_same(csa.image, "max"))
                    csa.token = T_MAXIMIZE;
                else if (the_same(csa.image, "subject"))
                {  if (csa.c == ' ')
                {  read_char(csa);
                    if (tolower(csa.c) == 't')
                    {  csa.token = T_SUBJECT_TO;
                        csa.image += ' ';
                        add_char(csa);
                        if (tolower(csa.c) != 'o')
                            error(csa, "keyword `subject to' incomplete");
                        add_char(csa);
                        if (isalpha(csa.c))
                            error(csa, "keyword `" + csa.image + csa.c + "...' not recognized");
                    }
                }
                }
                else if (the_same(csa.image, "such"))
                {  if (csa.c == ' ')
                {  read_char(csa);
                    if (tolower(csa.c) == 't')
                    {  csa.token = T_SUBJECT_TO;
                        csa.image += ' ';
                        add_char(csa);
                        if (tolower(csa.c) != 'h')
                            error(csa, "keyword `such that' incomplete");
                        add_char(csa);
                        if (tolower(csa.c) != 'a')
                            error(csa, "keyword `such that' incomplete");
                        add_char(csa);
                        if (tolower(csa.c) != 't')
                            error(csa, "keyword `such that' incomplete");
                        add_char(csa);
                        if (isalpha(csa.c))
                            error(csa, "keyword `" + csa.image + csa.c + "...' not recognized");
                    }
                }
                }
                else if (the_same(csa.image, "st"))
                    csa.token = T_SUBJECT_TO;
                else if (the_same(csa.image, "s.t."))
                    csa.token = T_SUBJECT_TO;
                else if (the_same(csa.image, "st."))
                    csa.token = T_SUBJECT_TO;
                else if (the_same(csa.image, "bounds"))
                    csa.token = T_BOUNDS;
                else if (the_same(csa.image, "bound"))
                    csa.token = T_BOUNDS;
                else if (the_same(csa.image, "general"))
                    csa.token = T_GENERAL;
                else if (the_same(csa.image, "generals"))
                    csa.token = T_GENERAL;
                else if (the_same(csa.image, "gen"))
                    csa.token = T_GENERAL;
                else if (the_same(csa.image, "integer"))
                    csa.token = T_INTEGER;
                else if (the_same(csa.image, "integers"))
                    csa.token = T_INTEGER;
                else if (the_same(csa.image, "int"))
                    csa.token = T_INTEGER;
                else if (the_same(csa.image, "binary"))
                    csa.token = T_BINARY;
                else if (the_same(csa.image, "binaries"))
                    csa.token = T_BINARY;
                else if (the_same(csa.image, "bin"))
                    csa.token = T_BINARY;
                else if (the_same(csa.image, "end"))
                    csa.token = T_END;
            }
        }

        while (true){
            flag = 0;
            /* skip non-significant characters */
            while (csa.c == ' ') read_char(csa);
            /* recognize and scan current token */
            if (csa.c == XEOF)
                csa.token = T_EOF;
            else if (csa.c == '\n')
            {  read_char(csa);
                /* if the next character is letter, it may begin a keyword */
                if (isalpha(csa.c))
                {  flag = 1;
                    name();
                } else
                    continue;
            }
            else if (csa.c == '\\')
            {  /* comment; ignore everything until end-of-line */
                while (csa.c != '\n') read_char(csa);
                continue;
            }
            else if (isalpha(csa.c) || csa.c != '.' && strchr(CHAR_SET, csa.c) >= 0){
                name();

            }
            else if (isdigit(csa.c) || csa.c == '.')
            {  /* numeric constant */
                csa.token = T_NUMBER;
                /* scan integer part */
                while (isdigit(csa.c)) add_char(csa);
                /* scan optional fractional part (it is mandatory, if there is
                 no integer part) */
                if (csa.c == '.')
                {  add_char(csa);
                    if (csa.image.length == 1 && !isdigit(csa.c))
                        error(csa, "invalid use of decimal point");
                    while (isdigit(csa.c)) add_char(csa);
                }
                /* scan optional decimal exponent */
                if (csa.c == 'e' || csa.c == 'E')
                {  add_char(csa);
                    if (csa.c == '+' || csa.c == '-') add_char(csa);
                    if (!isdigit(csa.c))
                        error(csa, "numeric constant `" + csa.image + "' incomplete");
                    while (isdigit(csa.c)) add_char(csa);
                }
                /* convert the numeric constant to floating-point */
                csa.value = Number(csa.image);
                if (csa.value == Number.NaN)
                    error(csa, "numeric constant `" + csa.image + "' out of range");
            }
            else if (csa.c == '+'){
                csa.token = T_PLUS; add_char(csa);
            }
            else if (csa.c == '-'){
                csa.token = T_MINUS; add_char(csa);
            }
            else if (csa.c == ':'){
                csa.token = T_COLON; add_char(csa);
            }
            else if (csa.c == '<')
            {  csa.token = T_LE; add_char(csa);
                if (csa.c == '=') add_char(csa);
            }
            else if (csa.c == '>')
            {  csa.token = T_GE; add_char(csa);
                if (csa.c == '=') add_char(csa);
            }
            else if (csa.c == '=')
            {  csa.token = T_EQ; add_char(csa);
                if (csa.c == '<'){
                    csa.token = T_LE; add_char(csa);
                }
                else if (csa.c == '>'){
                    csa.token = T_GE; add_char(csa);
                }
            }
            else
                error(csa, "character `" + csa.c + "' not recognized");
            break
        }

        /* skip non-significant characters */
        while (csa.c == ' ') read_char(csa);
    }

    function find_col(csa, name){
        /* find column by its symbolic name */
        var j = glp_find_col(csa.P, name);
        if (j == 0)
        {  /* not found; create new column */
            j = glp_add_cols(csa.P, 1);
            glp_set_col_name(csa.P, j, name);
            /* enlarge working arrays, if necessary */
            if (csa.n_max < j)
            {  var n_max = csa.n_max;
                var ind = csa.ind;
                var val = csa.val;
                var flag = csa.flag;
                var lb = csa.lb;
                var ub = csa.ub;
                csa.n_max += csa.n_max;
                csa.ind = new Array(1+csa.n_max);
                xcopyArr(csa.ind, 1, ind, 1, n_max);
                csa.val = new Array(1+csa.n_max);
                xcopyArr(csa.val, 1, val, 1, n_max);
                csa.flag = new Array(1+csa.n_max);
                xfillArr(csa.flag, 1, 0, csa.n_max);
                xcopyArr(csa.flag, 1, flag, 1, n_max);
                csa.lb = new Array(1+csa.n_max);
                xcopyArr(csa.lb, 1, lb, 1, n_max);
                csa.ub = new Array(1+csa.n_max);
                xcopyArr(csa.ub, 1, ub, 1, n_max);
            }
            csa.lb[j] = +DBL_MAX; csa.ub[j] = -DBL_MAX;
        }
        return j;
    }

    function parse_linear_form(csa){
        var j, k, len = 0, newlen;
        var s, coef;

        while(true){
            /* parse an optional sign */
            if (csa.token == T_PLUS){
                s = +1.0; scan_token(csa);
            }
            else if (csa.token == T_MINUS){
                s = -1.0; scan_token(csa);
            }
            else
                s = +1.0;
            /* parse an optional coefficient */
            if (csa.token == T_NUMBER){
                coef = csa.value; scan_token(csa);
            }
            else
                coef = 1.0;
            /* parse a variable name */
            if (csa.token != T_NAME)
                error(csa, "missing variable name");
            /* find the corresponding column */
            j = find_col(csa, csa.image);
            /* check if the variable is already used in the linear form */
            if (csa.flag[j])
                error(csa, "multiple use of variable `" + csa.image + "' not allowed");
            /* add new term to the linear form */
            len++; csa.ind[len] = j; csa.val[len] = s * coef;
            /* and mark that the variable is used in the linear form */
            csa.flag[j] = 1;
            scan_token(csa);
            /* if the next token is a sign, there is another term */
            if (csa.token == T_PLUS || csa.token == T_MINUS) continue;
            /* clear marks of the variables used in the linear form */
            for (k = 1; k <= len; k++) csa.flag[csa.ind[k]] = 0;
            /* remove zero coefficients */
            newlen = 0;
            for (k = 1; k <= len; k++)
            {  if (csa.val[k] != 0.0)
            {  newlen++;
                csa.ind[newlen] = csa.ind[k];
                csa.val[newlen] = csa.val[k];
            }
            }
            break;
        }
        return newlen;
    }

    function parse_objective(csa){
        /* parse objective sense */
        var k, len;
        /* parse the keyword 'minimize' or 'maximize' */
        if (csa.token == T_MINIMIZE)
            glp_set_obj_dir(csa.P, GLP_MIN);
        else if (csa.token == T_MAXIMIZE)
            glp_set_obj_dir(csa.P, GLP_MAX);
        else
            xassert(csa != csa);
        scan_token(csa);
        /* parse objective name */
        if (csa.token == T_NAME && csa.c == ':')
        {  /* objective name is followed by a colon */
            glp_set_obj_name(csa.P, csa.image);
            scan_token(csa);
            xassert(csa.token == T_COLON);
            scan_token(csa);
        }
        else
        {  /* objective name is not specified; use default */
            glp_set_obj_name(csa.P, "obj");
        }
        /* parse linear form */
        len = parse_linear_form(csa);
        for (k = 1; k <= len; k++)
            glp_set_obj_coef(csa.P, csa.ind[k], csa.val[k]);
    }

    function parse_constraints(csa){
        var i, len, type;
        var s;
        /* parse the keyword 'subject to' */
        xassert(csa.token == T_SUBJECT_TO);
        scan_token(csa);

        while (true){
            /* create new row (constraint) */
            i = glp_add_rows(csa.P, 1);
            /* parse row name */
            if (csa.token == T_NAME && csa.c == ':')
            {  /* row name is followed by a colon */
                if (glp_find_row(csa.P, csa.image) != 0)
                    error(csa, "constraint `" + csa.image + "' multiply defined");
                glp_set_row_name(csa.P, i, csa.image);
                scan_token(csa);
                xassert(csa.token == T_COLON);
                scan_token(csa);
            }
            else
            {  /* row name is not specified; use default */
                glp_set_row_name(csa.P, i, "r." + csa.count);
            }
            /* parse linear form */
            len = parse_linear_form(csa);
            glp_set_mat_row(csa.P, i, len, csa.ind, csa.val);
            /* parse constraint sense */
            if (csa.token == T_LE){
                type = GLP_UP; scan_token(csa);
            }
            else if (csa.token == T_GE){
                type = GLP_LO; scan_token(csa);
            }
            else if (csa.token == T_EQ){
                type = GLP_FX; scan_token(csa);
            }
            else
                error(csa, "missing constraint sense");
            /* parse right-hand side */
            if (csa.token == T_PLUS){
                s = +1.0; scan_token(csa);
            }
            else if (csa.token == T_MINUS){
                s = -1.0; scan_token(csa);
            }
            else
                s = +1.0;
            if (csa.token != T_NUMBER)
                error(csa, "missing right-hand side");
            glp_set_row_bnds(csa.P, i, type, s * csa.value, s * csa.value);
            /* the rest of the current line must be empty */
            if (!(csa.c == '\n' || csa.c == XEOF))
                error(csa, "invalid symbol(s) beyond right-hand side");
            scan_token(csa);
            /* if the next token is a sign, numeric constant, or a symbolic
             name, here is another constraint */
            if (csa.token == T_PLUS || csa.token == T_MINUS ||
                csa.token == T_NUMBER || csa.token == T_NAME) continue;
            break;
        }
    }

    function set_lower_bound(csa, j, lb){
        /* set lower bound of j-th variable */
        if (csa.lb[j] != +DBL_MAX)
        {
            warning(csa, "lower bound of variable `" + glp_get_col_name(csa.P, j) + "' redefined");
        }
        csa.lb[j] = lb;
    }

    function set_upper_bound(csa, j, ub){
        /* set upper bound of j-th variable */
        if (csa.ub[j] != -DBL_MAX)
        {
            warning(csa, "upper bound of variable `" + glp_get_col_name(csa.P, j) + "' redefined");
        }
        csa.ub[j] = ub;
    }

    function parse_bounds(csa){
        var j, lb_flag;
        var lb, s;
        /* parse the keyword 'bounds' */
        xassert(csa.token == T_BOUNDS);
        scan_token(csa);

        while (true){
            /* bound definition can start with a sign, numeric constant, or
             a symbolic name */
            if (!(csa.token == T_PLUS || csa.token == T_MINUS ||
                csa.token == T_NUMBER || csa.token == T_NAME)) return;
            /* parse bound definition */
            if (csa.token == T_PLUS || csa.token == T_MINUS)
            {  /* parse signed lower bound */
                lb_flag = 1;
                s = (csa.token == T_PLUS ? +1.0 : -1.0);
                scan_token(csa);
                if (csa.token == T_NUMBER){
                    lb = s * csa.value; scan_token(csa);
                }
                else if (the_same(csa.image, "infinity") ||
                    the_same(csa.image, "inf"))
                {  if (s > 0.0)
                    error(csa, "invalid use of `+inf' as lower bound");
                    lb = -DBL_MAX; scan_token(csa);
                }
                else
                    error(csa, "missing lower bound");
            }
            else if (csa.token == T_NUMBER)
            {  /* parse unsigned lower bound */
                lb_flag = 1;
                lb = csa.value; scan_token(csa);
            }
            else
            {  /* lower bound is not specified */
                lb_flag = 0;
            }
            /* parse the token that should follow the lower bound */
            if (lb_flag)
            {  if (csa.token != T_LE)
                error(csa, "missing `<', `<=', or `=<' after lower bound");
                scan_token(csa);
            }
            /* parse variable name */
            if (csa.token != T_NAME)
                error(csa, "missing variable name");
            j = find_col(csa, csa.image);
            /* set lower bound */
            if (lb_flag) set_lower_bound(csa, j, lb);
            scan_token(csa);
            /* parse the context that follows the variable name */
            if (csa.token == T_LE)
            {  /* parse upper bound */
                scan_token(csa);
                if (csa.token == T_PLUS || csa.token == T_MINUS)
                {  /* parse signed upper bound */
                    s = (csa.token == T_PLUS ? +1.0 : -1.0);
                    scan_token(csa);
                    if (csa.token == T_NUMBER)
                    {  set_upper_bound(csa, j, s * csa.value);
                        scan_token(csa);
                    }
                    else if (the_same(csa.image, "infinity") ||
                        the_same(csa.image, "inf"))
                    {  if (s < 0.0)
                        error(csa, "invalid use of `-inf' as upper bound");
                        set_upper_bound(csa, j, +DBL_MAX);
                        scan_token(csa);
                    }
                    else
                        error(csa, "missing upper bound");
                }
                else if (csa.token == T_NUMBER)
                {  /* parse unsigned upper bound */
                    set_upper_bound(csa, j, csa.value);
                    scan_token(csa);
                }
                else
                    error(csa, "missing upper bound");
            }
            else if (csa.token == T_GE)
            {  /* parse lower bound */
                if (lb_flag)
                {  /* the context '... <= x >= ...' is invalid */
                    error(csa, "invalid bound definition");
                }
                scan_token(csa);
                if (csa.token == T_PLUS || csa.token == T_MINUS)
                {  /* parse signed lower bound */
                    s = (csa.token == T_PLUS ? +1.0 : -1.0);
                    scan_token(csa);
                    if (csa.token == T_NUMBER)
                    {  set_lower_bound(csa, j, s * csa.value);
                        scan_token(csa);
                    }
                    else if (the_same(csa.image, "infinity") ||
                        the_same(csa.image, "inf") == 0)
                    {  if (s > 0.0)
                        error(csa, "invalid use of `+inf' as lower bound");
                        set_lower_bound(csa, j, -DBL_MAX);
                        scan_token(csa);
                    }
                    else
                        error(csa, "missing lower bound");
                }
                else if (csa.token == T_NUMBER)
                {  /* parse unsigned lower bound */
                    set_lower_bound(csa, j, csa.value);
                    scan_token(csa);
                }
                else
                    error(csa, "missing lower bound");
            }
            else if (csa.token == T_EQ)
            {  /* parse fixed value */
                if (lb_flag)
                {  /* the context '... <= x = ...' is invalid */
                    error(csa, "invalid bound definition");
                }
                scan_token(csa);
                if (csa.token == T_PLUS || csa.token == T_MINUS)
                {  /* parse signed fixed value */
                    s = (csa.token == T_PLUS ? +1.0 : -1.0);
                    scan_token(csa);
                    if (csa.token == T_NUMBER)
                    {  set_lower_bound(csa, j, s * csa.value);
                        set_upper_bound(csa, j, s * csa.value);
                        scan_token(csa);
                    }
                    else
                        error(csa, "missing fixed value");
                }
                else if (csa.token == T_NUMBER)
                {  /* parse unsigned fixed value */
                    set_lower_bound(csa, j, csa.value);
                    set_upper_bound(csa, j, csa.value);
                    scan_token(csa);
                }
                else
                    error(csa, "missing fixed value");
            }
            else if (the_same(csa.image, "free"))
            {  /* parse the keyword 'free' */
                if (lb_flag)
                {  /* the context '... <= x free ...' is invalid */
                    error(csa, "invalid bound definition");
                }
                set_lower_bound(csa, j, -DBL_MAX);
                set_upper_bound(csa, j, +DBL_MAX);
                scan_token(csa);
            }
            else if (!lb_flag)
            {  /* neither lower nor upper bounds are specified */
                error(csa, "invalid bound definition");
            }
        }
    }

    function parse_integer(csa){
        var j, binary;
        /* parse the keyword 'general', 'integer', or 'binary' */
        if (csa.token == T_GENERAL){
            binary = 0; scan_token(csa);
        }
        else if (csa.token == T_INTEGER){
            binary = 0; scan_token(csa);
        }
        else if (csa.token == T_BINARY){
            binary = 1; scan_token(csa);
        }
        else
            xassert(csa != csa);
        /* parse list of variables (may be empty) */
        while (csa.token == T_NAME)
        {  /* find the corresponding column */
            j = find_col(csa, csa.image);
            /* change kind of the variable */
            glp_set_col_kind(csa.P, j, GLP_IV);
            /* set 0-1 bounds for the binary variable */
            if (binary)
            {  set_lower_bound(csa, j, 0.0);
                set_upper_bound(csa, j, 1.0);
            }
            scan_token(csa);
        }
    }

    /* read problem data in CPLEX LP format */
    var csa = {};
    var ret;
    xprintf("Reading problem data");
    if (parm == null){
        parm = {};
    }
    /* check control parameters */
    check_parm("glp_read_lp", parm);
    /* initialize common storage area */
    csa.P = P;
    csa.parm = parm;
    csa.callback = callback;
    csa.count = 0;
    csa.c = '\n';
    csa.token = T_EOF;
    csa.image = "";
    csa.value = 0.0;
    csa.n_max = 100;
    csa.ind = new Array(1+csa.n_max);
    csa.val = new Array(1+csa.n_max);
    csa.flag = new Array(1+csa.n_max);
    xfillArr(csa.flag, 1, 0, csa.n_max);
    csa.lb = new Array(1+csa.n_max);
    csa.ub = new Array(1+csa.n_max);
    /* erase problem object */
    glp_erase_prob(P);
    glp_create_index(P);
    /* scan very first token */
    scan_token(csa);
    /* parse definition of the objective function */
    if (!(csa.token == T_MINIMIZE || csa.token == T_MAXIMIZE))
        error(csa, "`minimize' or `maximize' keyword missing");
    parse_objective(csa);
    /* parse constraints section */
    if (csa.token != T_SUBJECT_TO)
        error(csa, "constraints section missing");
    parse_constraints(csa);
    /* parse optional bounds section */
    if (csa.token == T_BOUNDS) parse_bounds(csa);
    /* parse optional general, integer, and binary sections */
    while (csa.token == T_GENERAL ||
        csa.token == T_INTEGER ||
        csa.token == T_BINARY) parse_integer(csa);
    /* check for the keyword 'end' */
    if (csa.token == T_END)
        scan_token(csa);
    else if (csa.token == T_EOF)
        warning(csa, "keyword `end' missing");
    else
        error(csa, "symbol " + csa.image + " in wrong position");
    /* nothing must follow the keyword 'end' (except comments) */
    if (csa.token != T_EOF)
        error(csa, "extra symbol(s) detected beyond `end'");
    /* set bounds of variables */
    {  var j, type;
        var lb, ub;
        for (j = 1; j <= P.n; j++)
        {  lb = csa.lb[j];
            ub = csa.ub[j];
            if (lb == +DBL_MAX) lb = 0.0;      /* default lb */
            if (ub == -DBL_MAX) ub = +DBL_MAX; /* default ub */
            if (lb == -DBL_MAX && ub == +DBL_MAX)
                type = GLP_FR;
            else if (ub == +DBL_MAX)
                type = GLP_LO;
            else if (lb == -DBL_MAX)
                type = GLP_UP;
            else if (lb != ub)
                type = GLP_DB;
            else
                type = GLP_FX;
            glp_set_col_bnds(csa.P, j, type, lb, ub);
        }
    }
    /* print some statistics */
    xprintf(P.m + " row" + (P.m == 1 ? "" : "s") + ", " + P.n + " column" + (P.n == 1 ? "" : "s") + ", " + P.nnz + " non-zero" + (P.nnz == 1 ? "" : "s"));
    if (glp_get_num_int(P) > 0)
    {  var ni = glp_get_num_int(P);
        var nb = glp_get_num_bin(P);
        if (ni == 1)
        {  if (nb == 0)
            xprintf("One variable is integer");
        else
            xprintf("One variable is binary");
        }
        else
        {   var line = ni + " integer variables, ";
            if (nb == 0)
                line += "none";
            else if (nb == 1)
                line += "one";
            else if (nb == ni)
                line += "all";
            else
                line += nb;
            xprintf(line + " of which " + (nb == 1 ? "is" : "are") + " binary");
        }
    }
    xprintf(csa.count + " lines were read");
    /* problem data has been successfully read */
    glp_delete_index(P);
    glp_sort_matrix(P);
    ret = 0;

    function done(){
        if (ret != 0) glp_erase_prob(P);
        return ret;
    }
    return done();
};

var glp_write_lp = exports.glp_write_lp = function(P, parm, callback){

    function check_name(name){
        /* check if specified name is valid for CPLEX LP format */
        if (name[0] == '.') return 1;
        if (isdigit((name[0]))) return 1;
        for (var i = 0; i < name.length; i++)
        {  if (!isalnum(name[i]) &&
            strchr(CHAR_SET, name[i]) < 0) return 1;
        }
        return 0; /* name is ok */
    }

    function adjust_name(name){
        /* attempt to adjust specified name to make it valid for CPLEX LP format */
        for (var i = 0; i < name.length; i++)
        {  if (name[i] == ' ')
            name[i] = '_';
        else if (name[i] == '-')
            name[i] = '~';
        else if (name[i] == '[')
            name[i] = '(';
        else if (name[i] == ']')
            name[i] = ')';
        }
    }

    function row_name(csa, i){
        /* construct symbolic name of i-th row (constraint) */
        var name;
        if (i == 0)
            name = glp_get_obj_name(csa.P);
        else
            name = glp_get_row_name(csa.P, i);
        if (name == null) return fake();
        adjust_name(name);
        if (check_name(name)) return fake();
        return name;

        function fake(){
            if (i == 0)
                return "obj";
            else
                return "r_" + i;
        }
    }

    function col_name(csa, j){
        /* construct symbolic name of j-th column (variable) */
        var name = glp_get_col_name(csa.P, j);
        if (name == null) return fake();
        adjust_name(name);
        if (check_name(name)) return fake();
        return name;
        function fake(){
            return "x_" + j;
        }
    }

    /* write problem data in CPLEX LP format */
    var csa = {};
    var row;
    var col;
    var aij;
    var i, j, len, flag, count, ret;
    var line, term, name;
    xprintf("Writing problem data");
    if (parm == null){
        parm = {};
    }
    /* check control parameters */
    check_parm("glp_write_lp", parm);
    /* initialize common storage area */
    csa.P = P;
    csa.parm = parm;
    count = 0;
    /* write problem name */
    callback("\\* Problem: " + (P.name == null ? "Unknown" : P.name) + " *\\"); count++;
    callback(""); count++;
    /* the problem should contain at least one row and one column */
    if (!(P.m > 0 && P.n > 0))
    {  xprintf("Warning: problem has no rows/columns");
        callback("\\* WARNING: PROBLEM HAS NO ROWS/COLUMNS *\\"); count++;
        callback(""); count++;
        return skip();
    }
    /* write the objective function definition */
    if (P.dir == GLP_MIN){
        callback("Minimize"); count++;
    }
    else if (P.dir == GLP_MAX){
        callback("Maximize"); count++;
    }
    else
        xassert(P != P);
    name = row_name(csa, 0);
    line = " " + name + ":";
    len = 0;
    for (j = 1; j <= P.n; j++)
    {  col = P.col[j];
        if (col.coef != 0.0 || col.ptr == null)
        {  len++;
            name = col_name(csa, j);
            if (col.coef == 0.0)
                term = " + 0 " + name; /* empty column */
            else if (col.coef == +1.0)
                term = " + " + name;
            else if (col.coef == -1.0)
                term = " - " + name;
            else if (col.coef > 0.0)
                term = " + " + col.coef + " " + name;
            else
                term = " - " + (-col.coef) + " " + name;
            if (line.length + term.length > 72){
                callback(line); line = ""; count++;
            }

            line += term;
        }
    }
    if (len == 0)
    {  /* empty objective */
        term = " 0 " + col_name(csa, 1);
        line += term;
    }
    callback(line); count++;
    if (P.c0 != 0.0){
        callback("\\* constant term = " + P.c0 + " *\\"); count++;
    }

    callback(""); count++;
    /* write the constraints section */
    callback("Subject To"); count++;
    for (i = 1; i <= P.m; i++)
    {  row = P.row[i];
        if (row.type == GLP_FR) continue; /* skip free row */
        name = row_name(csa, i);
        line = " " + name + ":";
        /* linear form */
        for (aij = row.ptr; aij != null; aij = aij.r_next)
        {  name = col_name(csa, aij.col.j);
            if (aij.val == +1.0)
                term =  " + " + name;
            else if (aij.val == -1.0)
                term = " - " + name;
            else if (aij.val > 0.0)
                term = " + " + aij.val + " "  + name;
            else
                term = " - " + (-aij.val) + " " + name;
            if (line.length + term.length > 72){
                callback(line); line = ""; count++;
            }

            line += term;
        }
        if (row.type == GLP_DB)
        {  /* double-bounded (ranged) constraint */
            term = " - ~r_" + i;
            if (line.length + term.length > 72){
                callback(line); line = ""; count++;
            }
            line += term;
        }
        else if (row.ptr == null)
        {  /* empty constraint */
            term = " 0 " + col_name(csa, 1);
            line += term;
        }
        /* right hand-side */
        if (row.type == GLP_LO)
            term = " >= " + row.lb;
        else if (row.type == GLP_UP)
            term = " <= " + row.ub;
        else if (row.type == GLP_DB || row.type == GLP_FX)
            term = " = " + row.lb;
        else
            xassert(row != row);
        if (line.length + term.length > 72){
            callback(line); line = ""; count++;
        }
        line += term;
        callback(line); count++;
    }
    callback(""); count++;
    /* write the bounds section */
    flag = 0;
    for (i = 1; i <= P.m; i++)
    {  row = P.row[i];
        if (row.type != GLP_DB) continue;
        if (!flag){
            callback("Bounds"); flag = 1; count++;
        }

        callback(" 0 <= ~r_" + i + " <= " + row.ub - row.lb); count++;
    }
    for (j = 1; j <= P.n; j++)
    {  col = P.col[j];
        if (col.type == GLP_LO && col.lb == 0.0) continue;
        if (!flag){
            callback("Bounds"); flag = 1; count++;
        }
        name = col_name(csa, j);
        if (col.type == GLP_FR){
            callback(" " + name + " free"); count++;
        }
        else if (col.type == GLP_LO){
            callback(" " + name + " >= " + col.lb); count++;
        }
        else if (col.type == GLP_UP){
            callback(" -Inf <= " + name + " <= " + col.ub); count++;
        }
        else if (col.type == GLP_DB){
            callback(" " + col.lb + " <= " + name + " <= " + col.ub); count++;
        }
        else if (col.type == GLP_FX){
            callback(" " + name + " = " + col.lb); count++;
        }
        else
            xassert(col != col);
    }
    if (flag) callback(""); count++;
    /* write the integer section */
    flag = 0;
    for (j = 1; j <= P.n; j++)
    {  col = P.col[j];
        if (col.kind == GLP_CV) continue;
        xassert(col.kind == GLP_IV);
        if (!flag){
            callback("Generals"); flag = 1; count++;
        }

        callback(" " + col_name(csa, j)); count++;
    }
    if (flag) {callback(""); count++}

    function skip(){
        /* write the end keyword */
        callback("End"); count++;
        /* problem data has been successfully written */
        xprintf(count + " lines were written");
        return 0;
    }
    return skip();
};

var glp_read_lp_from_string = exports.glp_read_lp_from_string = function(P, parm, str){
    var pos = 0;
    return glp_read_lp(P, parm,
        function(){
            if (pos < str.length){
                return str[pos++];
            } else
                return -1;
        }
    )
};

/* return codes: */
const
    FHV_ESING   = 1,  /* singular matrix */
    FHV_ECOND   = 2,  /* ill-conditioned matrix */
    FHV_ECHECK  = 3,  /* insufficient accuracy */
    FHV_ELIMIT  = 4,  /* update limit reached */
    FHV_EROOM   = 5;  /* SVA overflow */

function fhv_create_it(){
    var fhv;
    fhv = {};
    fhv.m_max = fhv.m = 0;
    fhv.valid = 0;
    fhv.luf = luf_create_it();
    fhv.hh_max = 50;
    fhv.hh_nfs = 0;
    fhv.hh_ind = fhv.hh_ptr = fhv.hh_len = null;
    fhv.p0_row = fhv.p0_col = null;
    fhv.cc_ind = null;
    fhv.cc_val = null;
    fhv.upd_tol = 1e-6;
    fhv.nnz_h = 0;
    return fhv;
}

function fhv_factorize(fhv, m, col, info){
    var ret;
    if (m < 1)
        xerror("fhv_factorize: m = " + m + "; invalid parameter");
    if (m > M_MAX)
        xerror("fhv_factorize: m = " + m + "; matrix too big");
    fhv.m = m;
    /* invalidate the factorization */
    fhv.valid = 0;
    /* allocate/reallocate arrays, if necessary */
    if (fhv.hh_ind == null)
        fhv.hh_ind = new Array(1+fhv.hh_max);
    if (fhv.hh_ptr == null)
        fhv.hh_ptr = new Array(1+fhv.hh_max);
    if (fhv.hh_len == null)
        fhv.hh_len = new Array(1+fhv.hh_max);
    if (fhv.m_max < m)
    {
        fhv.m_max = m + 100;
        fhv.p0_row = new Array(1+fhv.m_max);
        fhv.p0_col = new Array(1+fhv.m_max);
        fhv.cc_ind = new Array(1+fhv.m_max);
        fhv.cc_val = new Array(1+fhv.m_max);
    }
    /* try to factorize the basis matrix */
    switch (luf_factorize(fhv.luf, m, col, info))
    {  case 0:
        break;
        case LUF_ESING:
            ret = FHV_ESING;
            return ret;
        case LUF_ECOND:
            ret = FHV_ECOND;
            return ret;
        default:
            xassert(fhv != fhv);
    }
    /* the basis matrix has been successfully factorized */
    fhv.valid = 1;
    /* H := I */
    fhv.hh_nfs = 0;
    /* P0 := P */
    xcopyArr(fhv.p0_row, 1, fhv.luf.pp_row, 1, m);
    xcopyArr(fhv.p0_col, 1, fhv.luf.pp_col, 1, m);
    /* currently H has no factors */
    fhv.nnz_h = 0;
    ret = 0;
    /* return to the calling program */
    return ret;
}

function fhv_h_solve(fhv, tr, x){
    var nfs = fhv.hh_nfs;
    var hh_ind = fhv.hh_ind;
    var hh_ptr = fhv.hh_ptr;
    var hh_len = fhv.hh_len;
    var sv_ind = fhv.luf.sv_ind;
    var sv_val = fhv.luf.sv_val;
    var i, k, beg, end, ptr;
    var temp;
    if (!fhv.valid)
        xerror("fhv_h_solve: the factorization is not valid");
    if (!tr)
    {  /* solve the system H*x = b */
        for (k = 1; k <= nfs; k++)
        {  i = hh_ind[k];
            temp = x[i];
            beg = hh_ptr[k];
            end = beg + hh_len[k] - 1;
            for (ptr = beg; ptr <= end; ptr++)
                temp -= sv_val[ptr] * x[sv_ind[ptr]];
            x[i] = temp;
        }
    }
    else
    {  /* solve the system H'*x = b */
        for (k = nfs; k >= 1; k--)
        {  i = hh_ind[k];
            temp = x[i];
            if (temp == 0.0) continue;
            beg = hh_ptr[k];
            end = beg + hh_len[k] - 1;
            for (ptr = beg; ptr <= end; ptr++)
                x[sv_ind[ptr]] -= sv_val[ptr] * temp;
        }
    }
}

function fhv_ftran(fhv, x){
    var pp_row = fhv.luf.pp_row;
    var pp_col = fhv.luf.pp_col;
    var p0_row = fhv.p0_row;
    var p0_col = fhv.p0_col;
    if (!fhv.valid)
        xerror("fhv_ftran: the factorization is not valid");
    /* B = F*H*V, therefore inv(B) = inv(V)*inv(H)*inv(F) */
    fhv.luf.pp_row = p0_row;
    fhv.luf.pp_col = p0_col;
    luf_f_solve(fhv.luf, 0, x);
    fhv.luf.pp_row = pp_row;
    fhv.luf.pp_col = pp_col;
    fhv_h_solve(fhv, 0, x);
    luf_v_solve(fhv.luf, 0, x);
}

function fhv_btran(fhv, x){
    var pp_row = fhv.luf.pp_row;
    var pp_col = fhv.luf.pp_col;
    var p0_row = fhv.p0_row;
    var p0_col = fhv.p0_col;
    if (!fhv.valid)
        xerror("fhv_btran: the factorization is not valid");
    /* B = F*H*V, therefore inv(B') = inv(F')*inv(H')*inv(V') */
    luf_v_solve(fhv.luf, 1, x);
    fhv_h_solve(fhv, 1, x);
    fhv.luf.pp_row = p0_row;
    fhv.luf.pp_col = p0_col;
    luf_f_solve(fhv.luf, 1, x);
    fhv.luf.pp_row = pp_row;
    fhv.luf.pp_col = pp_col;
}

function fhv_update_it(fhv, j, len, ind, idx, val){
    var m = fhv.m;
    var luf = fhv.luf;
    var vr_ptr = luf.vr_ptr;
    var vr_len = luf.vr_len;
    var vr_cap = luf.vr_cap;
    var vr_piv = luf.vr_piv;
    var vc_ptr = luf.vc_ptr;
    var vc_len = luf.vc_len;
    var vc_cap = luf.vc_cap;
    var pp_row = luf.pp_row;
    var pp_col = luf.pp_col;
    var qq_row = luf.qq_row;
    var qq_col = luf.qq_col;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var work = luf.work;
    var eps_tol = luf.eps_tol;
    var hh_ind = fhv.hh_ind;
    var hh_ptr = fhv.hh_ptr;
    var hh_len = fhv.hh_len;
    var p0_row = fhv.p0_row;
    var p0_col = fhv.p0_col;
    var cc_ind = fhv.cc_ind;
    var cc_val = fhv.cc_val;
    var upd_tol = fhv.upd_tol;
    var i, i_beg, i_end, i_ptr, j_beg, j_end, j_ptr, k, k1, k2, p, q,
        p_beg, p_end, p_ptr, ptr, ret;
    var f, temp;
    if (!fhv.valid)
        xerror("fhv_update_it: the factorization is not valid");
    if (!(1 <= j && j <= m))
        xerror("fhv_update_it: j = " + j + "; column number out of range");
    /* check if the new factor of matrix H can be created */
    if (fhv.hh_nfs == fhv.hh_max)
    {  /* maximal number of updates has been reached */
        fhv.valid = 0;
        ret = FHV_ELIMIT;
        return ret;
    }
    /* convert new j-th column of B to dense format */
    for (i = 1; i <= m; i++)
        cc_val[i] = 0.0;
    for (k = 1; k <= len; k++)
    {  i = ind[idx + k];
        if (!(1 <= i && i <= m))
            xerror("fhv_update_it: ind[" + k + "] = " + i + "; row number out of range");
        if (cc_val[i] != 0.0)
            xerror("fhv_update_it: ind[" + k + "] = " + i + "; duplicate row index not allowed");
        if (val[k] == 0.0)
            xerror("fhv_update_it: val[" + k + "] = " + val[k] + "; zero element not allowed");
        cc_val[i] = val[k];
    }
    /* new j-th column of V := inv(F * H) * (new B[j]) */
    fhv.luf.pp_row = p0_row;
    fhv.luf.pp_col = p0_col;
    luf_f_solve(fhv.luf, 0, cc_val);
    fhv.luf.pp_row = pp_row;
    fhv.luf.pp_col = pp_col;
    fhv_h_solve(fhv, 0, cc_val);
    /* convert new j-th column of V to sparse format */
    len = 0;
    for (i = 1; i <= m; i++)
    {  temp = cc_val[i];
        if (temp == 0.0 || Math.abs(temp) < eps_tol) continue;
        len++; cc_ind[len] = i; cc_val[len] = temp;
    }
    /* clear old content of j-th column of matrix V */
    j_beg = vc_ptr[j];
    j_end = j_beg + vc_len[j] - 1;
    for (j_ptr = j_beg; j_ptr <= j_end; j_ptr++)
    {  /* get row index of v[i,j] */
        i = sv_ind[j_ptr];
        /* find v[i,j] in the i-th row */
        i_beg = vr_ptr[i];
        i_end = i_beg + vr_len[i] - 1;
        for (i_ptr = i_beg; sv_ind[i_ptr] != j; i_ptr++){/* nop */}
        xassert(i_ptr <= i_end);
        /* remove v[i,j] from the i-th row */
        sv_ind[i_ptr] = sv_ind[i_end];
        sv_val[i_ptr] = sv_val[i_end];
        vr_len[i]--;
    }
    /* now j-th column of matrix V is empty */
    luf.nnz_v -= vc_len[j];
    vc_len[j] = 0;
    /* add new elements of j-th column of matrix V to corresponding
     row lists; determine indices k1 and k2 */
    k1 = qq_row[j]; k2 = 0;
    for (ptr = 1; ptr <= len; ptr++)
    {  /* get row index of v[i,j] */
        i = cc_ind[ptr];
        /* at least one unused location is needed in i-th row */
        if (vr_len[i] + 1 > vr_cap[i])
        {  if (luf_enlarge_row(luf, i, vr_len[i] + 10))
        {  /* overflow of the sparse vector area */
            fhv.valid = 0;
            luf.new_sva = luf.sv_size + luf.sv_size;
            xassert(luf.new_sva > luf.sv_size);
            ret = FHV_EROOM;
            return ret;
        }
        }
        /* add v[i,j] to i-th row */
        i_ptr = vr_ptr[i] + vr_len[i];
        sv_ind[i_ptr] = j;
        sv_val[i_ptr] = cc_val[ptr];
        vr_len[i]++;
        /* adjust index k2 */
        if (k2 < pp_col[i]) k2 = pp_col[i];
    }
    /* capacity of j-th column (which is currently empty) should be
     not less than len locations */
    if (vc_cap[j] < len)
    {  if (luf_enlarge_col(luf, j, len))
    {  /* overflow of the sparse vector area */
        fhv.valid = 0;
        luf.new_sva = luf.sv_size + luf.sv_size;
        xassert(luf.new_sva > luf.sv_size);
        ret = FHV_EROOM;
        return ret;
    }
    }
    /* add new elements of matrix V to j-th column list */
    j_ptr = vc_ptr[j];
    xcopyArr(sv_ind, j_ptr, cc_ind, 1, len);
    xcopyArr(sv_val, j_ptr, cc_val, 1, len);
    vc_len[j] = len;
    luf.nnz_v += len;
    /* if k1 > k2, diagonal element u[k2,k2] of matrix U is zero and
     therefore the adjacent basis matrix is structurally singular */
    if (k1 > k2)
    {  fhv.valid = 0;
        ret = FHV_ESING;
        return ret;
    }
    /* perform implicit symmetric permutations of rows and columns of
     matrix U */
    i = pp_row[k1]; j = qq_col[k1];
    for (k = k1; k < k2; k++)
    {  pp_row[k] = pp_row[k+1]; pp_col[pp_row[k]] = k;
        qq_col[k] = qq_col[k+1]; qq_row[qq_col[k]] = k;
    }
    pp_row[k2] = i; pp_col[i] = k2;
    qq_col[k2] = j; qq_row[j] = k2;
    /* now i-th row of the matrix V is k2-th row of matrix U; since
     no pivoting is used, only this row will be transformed */
    /* copy elements of i-th row of matrix V to the working array and
     remove these elements from matrix V */
    for (j = 1; j <= m; j++) work[j] = 0.0;
    i_beg = vr_ptr[i];
    i_end = i_beg + vr_len[i] - 1;
    for (i_ptr = i_beg; i_ptr <= i_end; i_ptr++)
    {  /* get column index of v[i,j] */
        j = sv_ind[i_ptr];
        /* store v[i,j] to the working array */
        work[j] = sv_val[i_ptr];
        /* find v[i,j] in the j-th column */
        j_beg = vc_ptr[j];
        j_end = j_beg + vc_len[j] - 1;
        for (j_ptr = j_beg; sv_ind[j_ptr] != i; j_ptr++){/* nop */}
        xassert(j_ptr <= j_end);
        /* remove v[i,j] from the j-th column */
        sv_ind[j_ptr] = sv_ind[j_end];
        sv_val[j_ptr] = sv_val[j_end];
        vc_len[j]--;
    }
    /* now i-th row of matrix V is empty */
    luf.nnz_v -= vr_len[i];
    vr_len[i] = 0;
    /* create the next row-like factor of the matrix H; this factor
     corresponds to i-th (transformed) row */
    fhv.hh_nfs++;
    hh_ind[fhv.hh_nfs] = i;
    /* hh_ptr[] will be set later */
    hh_len[fhv.hh_nfs] = 0;
    /* up to (k2 - k1) free locations are needed to add new elements
     to the non-trivial row of the row-like factor */
    if (luf.sv_end - luf.sv_beg < k2 - k1)
    {  luf_defrag_sva(luf);
        if (luf.sv_end - luf.sv_beg < k2 - k1)
        {  /* overflow of the sparse vector area */
            fhv.valid = luf.valid = 0;
            luf.new_sva = luf.sv_size + luf.sv_size;
            xassert(luf.new_sva > luf.sv_size);
            ret = FHV_EROOM;
            return ret;
        }
    }
    /* eliminate subdiagonal elements of matrix U */
    for (k = k1; k < k2; k++)
    {  /* v[p,q] = u[k,k] */
        p = pp_row[k]; q = qq_col[k];
        /* this is the crucial point, where even tiny non-zeros should
         not be dropped */
        if (work[q] == 0.0) continue;
        /* compute gaussian multiplier f = v[i,q] / v[p,q] */
        f = work[q] / vr_piv[p];
        /* perform gaussian transformation:
         (i-th row) := (i-th row) - f * (p-th row)
         in order to eliminate v[i,q] = u[k2,k] */
        p_beg = vr_ptr[p];
        p_end = p_beg + vr_len[p] - 1;
        for (p_ptr = p_beg; p_ptr <= p_end; p_ptr++)
            work[sv_ind[p_ptr]] -= f * sv_val[p_ptr];
        /* store new element (gaussian multiplier that corresponds to
         p-th row) in the current row-like factor */
        luf.sv_end--;
        sv_ind[luf.sv_end] = p;
        sv_val[luf.sv_end] = f;
        hh_len[fhv.hh_nfs]++;
    }
    /* set pointer to the current row-like factor of the matrix H
     (if no elements were added to this factor, it is unity matrix
     and therefore can be discarded) */
    if (hh_len[fhv.hh_nfs] == 0)
        fhv.hh_nfs--;
    else
    {  hh_ptr[fhv.hh_nfs] = luf.sv_end;
        fhv.nnz_h += hh_len[fhv.hh_nfs];
    }
    /* store new pivot which corresponds to u[k2,k2] */
    vr_piv[i] = work[qq_col[k2]];
    /* new elements of i-th row of matrix V (which are non-diagonal
     elements u[k2,k2+1], ..., u[k2,m] of matrix U = P*V*Q) now are
     contained in the working array; add them to matrix V */
    len = 0;
    for (k = k2+1; k <= m; k++)
    {  /* get column index and value of v[i,j] = u[k2,k] */
        j = qq_col[k];
        temp = work[j];
        /* if v[i,j] is close to zero, skip it */
        if (Math.abs(temp) < eps_tol) continue;
        /* at least one unused location is needed in j-th column */
        if (vc_len[j] + 1 > vc_cap[j])
        {  if (luf_enlarge_col(luf, j, vc_len[j] + 10))
        {  /* overflow of the sparse vector area */
            fhv.valid = 0;
            luf.new_sva = luf.sv_size + luf.sv_size;
            xassert(luf.new_sva > luf.sv_size);
            ret = FHV_EROOM;
            return ret;
        }
        }
        /* add v[i,j] to j-th column */
        j_ptr = vc_ptr[j] + vc_len[j];
        sv_ind[j_ptr] = i;
        sv_val[j_ptr] = temp;
        vc_len[j]++;
        /* also store v[i,j] to the auxiliary array */
        len++; cc_ind[len] = j; cc_val[len] = temp;
    }
    /* capacity of i-th row (which is currently empty) should be not
     less than len locations */
    if (vr_cap[i] < len)
    {  if (luf_enlarge_row(luf, i, len))
    {  /* overflow of the sparse vector area */
        fhv.valid = 0;
        luf.new_sva = luf.sv_size + luf.sv_size;
        xassert(luf.new_sva > luf.sv_size);
        ret = FHV_EROOM;
        return ret;
    }
    }
    /* add new elements to i-th row list */
    i_ptr = vr_ptr[i];
    xcopyArr(sv_ind, i_ptr, cc_ind, 1, len);
    xcopyArr(sv_val, i_ptr, cc_val, 1, len);
    vr_len[i] = len;
    luf.nnz_v += len;
    /* updating is finished; check that diagonal element u[k2,k2] is
     not very small in absolute value among other elements in k2-th
     row and k2-th column of matrix U = P*V*Q */
    /* temp = max(|u[k2,*]|, |u[*,k2]|) */
    temp = 0.0;
    /* walk through k2-th row of U which is i-th row of V */
    i = pp_row[k2];
    i_beg = vr_ptr[i];
    i_end = i_beg + vr_len[i] - 1;
    for (i_ptr = i_beg; i_ptr <= i_end; i_ptr++)
        if (temp < Math.abs(sv_val[i_ptr])) temp = Math.abs(sv_val[i_ptr]);
    /* walk through k2-th column of U which is j-th column of V */
    j = qq_col[k2];
    j_beg = vc_ptr[j];
    j_end = j_beg + vc_len[j] - 1;
    for (j_ptr = j_beg; j_ptr <= j_end; j_ptr++)
        if (temp < Math.abs(sv_val[j_ptr])) temp = Math.abs(sv_val[j_ptr]);
    /* check that u[k2,k2] is not very small */
    if (Math.abs(vr_piv[i]) < upd_tol * temp)
    {  /* the factorization seems to be inaccurate and therefore must
     be recomputed */
        fhv.valid = 0;
        ret = FHV_ECHECK;
        return ret;
    }
    /* the factorization has been successfully updated */
    ret = 0;
    /* return to the calling program */
    return ret;
}

function glp_adv_basis(lp, flags){
    function triang(m, n, info, mat, rn, cn){
        var ndx; /* int ndx[1+max(m,n)]; */
        /* this array is used for querying row and column patterns of the
         given matrix A (the third parameter to the routine mat) */
        var rs_len; /* int rs_len[1+m]; */
        /* rs_len[0] is not used;
         rs_len[i], 1 <= i <= m, is number of non-zeros in the i-th row
         of the matrix A, which (non-zeros) belong to the current active
         submatrix */
        var rs_head; /* int rs_head[1+n]; */
        /* rs_head[len], 0 <= len <= n, is the number i of the first row
         of the matrix A, for which rs_len[i] = len */
        var rs_prev; /* int rs_prev[1+m]; */
        /* rs_prev[0] is not used;
         rs_prev[i], 1 <= i <= m, is a number i' of the previous row of
         the matrix A, for which rs_len[i] = rs_len[i'] (zero marks the
         end of this linked list) */
        var rs_next; /* int rs_next[1+m]; */
        /* rs_next[0] is not used;
         rs_next[i], 1 <= i <= m, is a number i' of the next row of the
         matrix A, for which rs_len[i] = rs_len[i'] (zero marks the end
         this linked list) */
        var cs_head;
        /* is a number j of the first column of the matrix A, which has
         maximal number of non-zeros among other columns */
        var cs_prev; /* cs_prev[1+n]; */
        /* cs_prev[0] is not used;
         cs_prev[j], 1 <= j <= n, is a number of the previous column of
         the matrix A with the same or greater number of non-zeros than
         in the j-th column (zero marks the end of this linked list) */
        var cs_next; /* cs_next[1+n]; */
        /* cs_next[0] is not used;
         cs_next[j], 1 <= j <= n, is a number of the next column of
         the matrix A with the same or lesser number of non-zeros than
         in the j-th column (zero marks the end of this linked list) */
        var i, j, ii, jj, k1, k2, len, t, size = 0;
        var head, rn_inv, cn_inv;
        if (!(m > 0 && n > 0))
            xerror("triang: m = " + m + "; n = " + n + "; invalid dimension");
        /* allocate working arrays */
        ndx = new Array(1+(m >= n ? m : n));
        rs_len = new Array(1+m);
        rs_head = new Array(1+n);
        rs_prev = new Array(1+m);
        rs_next = new Array(1+m);
        cs_prev = new Array(1+n);
        cs_next = new Array(1+n);
        /* build linked lists of columns of the matrix A with the same
         number of non-zeros */
        head = rs_len; /* currently rs_len is used as working array */
        for (len = 0; len <= m; len ++) head[len] = 0;
        for (j = 1; j <= n; j++)
        {  /* obtain length of the j-th column */
            len = mat(info, -j, ndx);
            xassert(0 <= len && len <= m);
            /* include the j-th column in the corresponding linked list */
            cs_prev[j] = head[len];
            head[len] = j;
        }
        /* merge all linked lists of columns in one linked list, where
         columns are ordered by descending of their lengths */
        cs_head = 0;
        for (len = 0; len <= m; len++)
        {  for (j = head[len]; j != 0; j = cs_prev[j])
        {  cs_next[j] = cs_head;
            cs_head = j;
        }
        }
        jj = 0;
        for (j = cs_head; j != 0; j = cs_next[j])
        {  cs_prev[j] = jj;
            jj = j;
        }
        /* build initial doubly linked lists of rows of the matrix A with
         the same number of non-zeros */
        for (len = 0; len <= n; len++) rs_head[len] = 0;
        for (i = 1; i <= m; i++)
        {  /* obtain length of the i-th row */
            rs_len[i] = len = mat(info, +i, ndx);
            xassert(0 <= len && len <= n);
            /* include the i-th row in the correspondng linked list */
            rs_prev[i] = 0;
            rs_next[i] = rs_head[len];
            if (rs_next[i] != 0) rs_prev[rs_next[i]] = i;
            rs_head[len] = i;
        }
        /* initially all rows and columns of the matrix A are active */
        for (i = 1; i <= m; i++) rn[i] = 0;
        for (j = 1; j <= n; j++) cn[j] = 0;
        /* set initial bounds of the active submatrix */
        k1 = 1; k2 = n;
        /* main loop starts here */
        while (k1 <= k2)
        {  i = rs_head[1];
            if (i != 0)
            {  /* the i-th row of the matrix A is a row singleton, since
             it has the only non-zero in the active submatrix */
                xassert(rs_len[i] == 1);
                /* determine the number j of an active column of the matrix
                 A, in which this non-zero is placed */
                j = 0;
                t = mat(info, +i, ndx);
                xassert(0 <= t && t <= n);
                for (; t >= 1; t--)
                {  jj = ndx[t];
                    xassert(1 <= jj && jj <= n);
                    if (cn[jj] == 0)
                    {  xassert(j == 0);
                        j = jj;
                    }
                }
                xassert(j != 0);
                /* the singleton is a[i,j]; move a[i,j] to the position
                 b[k1,k1] of the matrix B */
                rn[i] = cn[j] = k1;
                /* shift the left bound of the active submatrix */
                k1++;
                /* increase the size of the lower triangular part */
                size++;
            }
            else
            {  /* the current active submatrix has no row singletons */
                /* remove an active column with maximal number of non-zeros
                 from the active submatrix */
                j = cs_head;
                xassert(j != 0);
                cn[j] = k2;
                /* shift the right bound of the active submatrix */
                k2--;
            }
            /* the j-th column of the matrix A has been removed from the
             active submatrix */
            /* remove the j-th column from the linked list */
            if (cs_prev[j] == 0)
                cs_head = cs_next[j];
            else
                cs_next[cs_prev[j]] = cs_next[j];
            if (cs_next[j] != 0)
                cs_prev[cs_next[j]] = cs_prev[j];
            /* go through non-zeros of the j-th columns and update active
             lengths of the corresponding rows */
            t = mat(info, -j, ndx);
            xassert(0 <= t && t <= m);
            for (; t >= 1; t--)
            {  i = ndx[t];
                xassert(1 <= i && i <= m);
                /* the non-zero a[i,j] has left the active submatrix */
                len = rs_len[i];
                xassert(len >= 1);
                /* remove the i-th row from the linked list of rows with
                 active length len */
                if (rs_prev[i] == 0)
                    rs_head[len] = rs_next[i];
                else
                    rs_next[rs_prev[i]] = rs_next[i];
                if (rs_next[i] != 0)
                    rs_prev[rs_next[i]] = rs_prev[i];
                /* decrease the active length of the i-th row */
                rs_len[i] = --len;
                /* return the i-th row to the corresponding linked list */
                rs_prev[i] = 0;
                rs_next[i] = rs_head[len];
                if (rs_next[i] != 0) rs_prev[rs_next[i]] = i;
                rs_head[len] = i;
            }
        }
        /* other rows of the matrix A, which are still active, correspond
         to rows k1, ..., m of the matrix B (in arbitrary order) */
        for (i = 1; i <= m; i++) if (rn[i] == 0) rn[i] = k1++;
        /* but for columns this is not needed, because now the submatrix
         B2 has no columns */
        for (j = 1; j <= n; j++) xassert(cn[j] != 0);
        /* perform some optional checks */
        /* make sure that rn is a permutation of {1, ..., m} and cn is a
         permutation of {1, ..., n} */
        rn_inv = rs_len; /* used as working array */
        for (ii = 1; ii <= m; ii++) rn_inv[ii] = 0;
        for (i = 1; i <= m; i++)
        {  ii = rn[i];
            xassert(1 <= ii && ii <= m);
            xassert(rn_inv[ii] == 0);
            rn_inv[ii] = i;
        }
        cn_inv = rs_head; /* used as working array */
        for (jj = 1; jj <= n; jj++) cn_inv[jj] = 0;
        for (j = 1; j <= n; j++)
        {  jj = cn[j];
            xassert(1 <= jj && jj <= n);
            xassert(cn_inv[jj] == 0);
            cn_inv[jj] = j;
        }
        /* make sure that the matrix B = P*A*Q really has the form, which
         was declared */
        for (ii = 1; ii <= size; ii++)
        {  var diag = 0;
            i = rn_inv[ii];
            t = mat(info, +i, ndx);
            xassert(0 <= t && t <= n);
            for (; t >= 1; t--)
            {  j = ndx[t];
                xassert(1 <= j && j <= n);
                jj = cn[j];
                if (jj <= size) xassert(jj <= ii);
                if (jj == ii)
                {  xassert(!diag);
                    diag = 1;
                }
            }
            xassert(diag);
        }
        /* return to the calling program */
        return size;
    }

    function mat(lp, k, ndx){
        /* this auxiliary routine returns the pattern of a given row or
         a given column of the augmented constraint matrix A~ = (I|-A),
         in which columns of fixed variables are implicitly cleared */
        var m = lpx_get_num_rows(lp);
        var n = lpx_get_num_cols(lp);
        var i, j, lll, len = 0;

        if (k > 0)
        {  /* the pattern of the i-th row is required */
            i = +k;
            xassert(1 <= i && i <= m);
            lll = lpx_get_mat_row(lp, i, ndx, null);
            for (k = 1; k <= lll; k++)
            {
                lpx_get_col_bnds(lp, ndx[k], function(typx){
                        if (typx != LPX_FX) ndx[++len] = m + ndx[k];
                });

            }
            lpx_get_row_bnds(lp, i, function(typx){
                if (typx != LPX_FX) ndx[++len] = i;
            });
        }
        else
        {  /* the pattern of the j-th column is required */
            j = -k;
            xassert(1 <= j && j <= m+n);
            /* if the (auxiliary or structural) variable x[j] is fixed,
             the pattern of its column is empty */

            function doit(typx){
                if (typx != LPX_FX)
                {  if (j <= m)
                {  /* x[j] is non-fixed auxiliary variable */
                    ndx[++len] = j;
                }
                else
                {  /* x[j] is non-fixed structural variables */
                    len = lpx_get_mat_col(lp, j-m, ndx, null);
                }
                }
            }

            if (j <= m)
                lpx_get_row_bnds(lp, j, doit);
            else
                lpx_get_col_bnds(lp, j-m, doit);

        }
        /* return the length of the row/column pattern */
        return len;
    }

    function adv_basis(lp){
        var m = lpx_get_num_rows(lp);
        var n = lpx_get_num_cols(lp);
        var i, j, jj, k, size;
        var rn, cn, rn_inv, cn_inv;
        var tagx = new Array(1+m+n);
        xprintf("Constructing initial basis...");
        if (m == 0 || n == 0)
        {  glp_std_basis(lp);
            return;
        }
        /* use the routine triang (see above) to find maximal triangular
         part of the augmented constraint matrix A~ = (I|-A); in order
         to prevent columns of fixed variables to be included in the
         triangular part, such columns are implictly removed from the
         matrix A~ by the routine adv_mat */
        rn = new Array(1+m);
        cn = new Array(1+m+n);
        size = triang(m, m+n, lp, mat, rn, cn);
        if (lpx_get_int_parm(lp, LPX_K_MSGLEV) >= 3)
            xprintf("Size of triangular part = " + size + "");
        /* the first size rows and columns of the matrix P*A~*Q (where
         P and Q are permutation matrices defined by the arrays rn and
         cn) form a lower triangular matrix; build the arrays (rn_inv
         and cn_inv), which define the matrices inv(P) and inv(Q) */
        rn_inv = new Array(1+m);
        cn_inv = new Array(1+m+n);
        for (i = 1; i <= m; i++) rn_inv[rn[i]] = i;
        for (j = 1; j <= m+n; j++) cn_inv[cn[j]] = j;
        /* include the columns of the matrix A~, which correspond to the
         first size columns of the matrix P*A~*Q, in the basis */
        for (k = 1; k <= m+n; k++) tagx[k] = -1;
        for (jj = 1; jj <= size; jj++)
        {  j = cn_inv[jj];
            /* the j-th column of A~ is the jj-th column of P*A~*Q */
            tagx[j] = LPX_BS;
        }
        /* if size < m, we need to add appropriate columns of auxiliary
         variables to the basis */
        for (jj = size + 1; jj <= m; jj++)
        {  /* the jj-th column of P*A~*Q should be replaced by the column
         of the auxiliary variable, for which the only unity element
         is placed in the position [jj,jj] */
            i = rn_inv[jj];
            /* the jj-th row of P*A~*Q is the i-th row of A~, but in the
             i-th row of A~ the unity element belongs to the i-th column
             of A~; therefore the disired column corresponds to the i-th
             auxiliary variable (note that this column doesn't belong to
             the triangular part found by the routine triang) */
            xassert(1 <= i && i <= m);
            xassert(cn[i] > size);
            tagx[i] = LPX_BS;
        }
        /* build tags of non-basic variables */
        for (k = 1; k <= m+n; k++){
            if (tagx[k] != LPX_BS){

                function doit(typx, lb, ub){
                    switch (typx){
                        case LPX_FR:
                            tagx[k] = LPX_NF; break;
                        case LPX_LO:
                            tagx[k] = LPX_NL; break;
                        case LPX_UP:
                            tagx[k] = LPX_NU; break;
                        case LPX_DB:
                            tagx[k] = (Math.abs(lb) <= Math.abs(ub) ? LPX_NL : LPX_NU); break;
                        case LPX_FX:
                            tagx[k] = LPX_NS; break;
                        default:
                            xassert(typx != typx);
                    }
                }

                if (k <= m)
                    lpx_get_row_bnds(lp, k, doit);
                else
                    lpx_get_col_bnds(lp, k-m, doit);
            }
        }
        for (k = 1; k <= m+n; k++){
            if (k <= m)
                lpx_set_row_stat(lp, k, tagx[k]);
            else
                lpx_set_col_stat(lp, k-m, tagx[k]);
        }
    }

    if (flags != 0)
        xerror("glp_adv_basis: flags = " + flags + "; invalid flags");
    if (lp.m == 0 || lp.n == 0)
        glp_std_basis(lp);
    else
        adv_basis(lp);
}

function cpx_basis(lp){
    /* main routine */
    var C, C2, C3, C4;
    var m, n, i, j, jk, k, l, ll, t, n2, n3, n4, type, len, I, r, ind;
    var alpha, gamma, cmax, temp, v, val;
    xprintf("Constructing initial basis...");
    /* determine the number of rows and columns */
    m = glp_get_num_rows(lp);
    n = glp_get_num_cols(lp);
    /* allocate working arrays */
    C = new Array(1+n);
    I = new Array(1+m);
    r = new Array(1+m);
    v = new Array(1+m);
    ind = new Array(1+m);
    val = new Array(1+m);
    /* make all auxiliary variables non-basic */
    for (i = 1; i <= m; i++)
    {  if (glp_get_row_type(lp, i) != GLP_DB)
        glp_set_row_stat(lp, i, GLP_NS);
    else if (Math.abs(glp_get_row_lb(lp, i)) <=
        Math.abs(glp_get_row_ub(lp, i)))
        glp_set_row_stat(lp, i, GLP_NL);
    else
        glp_set_row_stat(lp, i, GLP_NU);
    }
    /* make all structural variables non-basic */
    for (j = 1; j <= n; j++)
    {  if (glp_get_col_type(lp, j) != GLP_DB)
        glp_set_col_stat(lp, j, GLP_NS);
    else if (Math.abs(glp_get_col_lb(lp, j)) <=
        Math.abs(glp_get_col_ub(lp, j)))
        glp_set_col_stat(lp, j, GLP_NL);
    else
        glp_set_col_stat(lp, j, GLP_NU);
    }
    /* C2 is a set of free structural variables */
    n2 = 0; C2 = 0;
    for (j = 1; j <= n; j++)
    {  type = glp_get_col_type(lp, j);
        if (type == GLP_FR)
        {   n2++;
            C[C2 + n2].j = j;
            C[C2 + n2].q = 0.0;
        }
    }
    /* C3 is a set of structural variables having excatly one (lower
     or upper) bound */
    n3 = 0; C3 = C2 + n2;
    for (j = 1; j <= n; j++)
    {  type = glp_get_col_type(lp, j);
        if (type == GLP_LO)
        {  n3++;
            C[C3 + n3].j = j;
            C[C3 + n3].q = + glp_get_col_lb(lp, j);
        }
        else if (type == GLP_UP)
        {  n3++;
            C[C3 + n3].j = j;
            C[C3 + n3].q = - glp_get_col_ub(lp, j);
        }
    }
    /* C4 is a set of structural variables having both (lower and
     upper) bounds */
    n4 = 0; C4 = C3 + n3;
    for (j = 1; j <= n; j++)
    {  type = glp_get_col_type(lp, j);
        if (type == GLP_DB)
        {  n4++;
            C[C4 + n4].j = j;
            C[C4 + n4].q = glp_get_col_lb(lp, j) - glp_get_col_ub(lp, j);
        }
    }
    /* compute gamma = max{|c[j]|: 1 <= j <= n} */
    gamma = 0.0;
    for (j = 1; j <= n; j++)
    {  temp = Math.abs(glp_get_obj_coef(lp, j));
        if (gamma < temp) gamma = temp;
    }
    /* compute cmax */
    cmax = (gamma == 0.0 ? 1.0 : 1000.0 * gamma);
    /* compute final penalty for all structural variables within sets
     C2, C3, and C4 */
    switch (glp_get_obj_dir(lp))
    {  case GLP_MIN: temp = +1.0; break;
        case GLP_MAX: temp = -1.0; break;
        default: xassert(lp != lp);
    }
    for (k = 1; k <= n2+n3+n4; k++)
    {  j = C[k].j;
        C[k].q += (temp * glp_get_obj_coef(lp, j)) / cmax;
    }
    /* sort structural variables within C2, C3, and C4 in ascending
     order of penalty value */

    function fcmp(col1, col2){
        /* this routine is passed to the qsort() function */
        if (col1.q < col2.q) return -1;
        if (col1.q > col2.q) return +1;
        return 0;
    }

    xqsort(C, C2+1+n2, fcmp);
    for (k = 1; k < n2; k++) xassert(C[C2+k].q <= C[C2+k+1].q);
    xqsort(C, C3+1+n3, fcmp);
    for (k = 1; k < n3; k++) xassert(C[C3+k].q <= C[C3+k+1].q);
    xqsort(C, C4+1+n4, fcmp);
    for (k = 1; k < n4; k++) xassert(C[C4+k].q <= C[C4+k+1].q);
    /*** STEP 1 ***/
    for (i = 1; i <= m; i++)
    {  type = glp_get_row_type(lp, i);
        if (type != GLP_FX)
        {  /* row i is either free or inequality constraint */
            glp_set_row_stat(lp, i, GLP_BS);
            I[i] = 1;
            r[i] = 1;
        }
        else
        {  /* row i is equality constraint */
            I[i] = 0;
            r[i] = 0;
        }
        v[i] = +DBL_MAX;
    }
    /*** STEP 2 ***/

    function get_column(lp, j, ind, val){
        /* Bixby's algorithm assumes that the constraint matrix is scaled
         such that the maximum absolute value in every non-zero row and
         column is 1 */
        var k;
        var len = glp_get_mat_col(lp, j, ind, val);
        var big = 0.0;
        for (k = 1; k <= len; k++)
            if (big < Math.abs(val[k])) big = Math.abs(val[k]);
        if (big == 0.0) big = 1.0;
        for (k = 1; k <= len; k++) val[k] /= big;
        return len;
    }

    for (k = 1; k <= n2+n3+n4; k++)
    {  jk = C[k].j;
        len = get_column(lp, jk, ind, val);
        /* let alpha = max{|A[l,jk]|: r[l] = 0} and let l' be such
         that alpha = |A[l',jk]| */
        alpha = 0.0; ll = 0;
        for (t = 1; t <= len; t++)
        {  l = ind[t];
            if (r[l] == 0 && alpha < Math.abs(val[t])){
                alpha = Math.abs(val[t]); ll = l;
            }
        }
        if (alpha >= 0.99)
        {  /* B := B union {jk} */
            glp_set_col_stat(lp, jk, GLP_BS);
            I[ll] = 1;
            v[ll] = alpha;
            /* r[l] := r[l] + 1 for all l such that |A[l,jk]| != 0 */
            for (t = 1; t <= len; t++)
            {  l = ind[t];
                if (val[t] != 0.0) r[l]++;
            }
            /* continue to the next k */
            continue;
        }
        /* if |A[l,jk]| > 0.01 * v[l] for some l, continue to the
         next k */
        for (t = 1; t <= len; t++)
        {  l = ind[t];
            if (Math.abs(val[t]) > 0.01 * v[l]) break;
        }
        if (t <= len) continue;
        /* otherwise, let alpha = max{|A[l,jk]|: I[l] = 0} and let l'
         be such that alpha = |A[l',jk]| */
        alpha = 0.0; ll = 0;
        for (t = 1; t <= len; t++)
        {  l = ind[t];
            if (I[l] == 0 && alpha < Math.abs(val[t])){
                alpha = Math.abs(val[t]); ll = l;
            }
        }
        /* if alpha = 0, continue to the next k */
        if (alpha == 0.0) continue;
        /* B := B union {jk} */
        glp_set_col_stat(lp, jk, GLP_BS);
        I[ll] = 1;
        v[ll] = alpha;
        /* r[l] := r[l] + 1 for all l such that |A[l,jk]| != 0 */
        for (t = 1; t <= len; t++)
        {  l = ind[t];
            if (val[t] != 0.0) r[l]++;
        }
    }
    /*** STEP 3 ***/
    /* add an artificial variable (auxiliary variable for equality
     constraint) to cover each remaining uncovered row */
    for (i = 1; i <= m; i++)
        if (I[i] == 0) glp_set_row_stat(lp, i, GLP_BS);
}

function glp_cpx_basis(lp){
    if (lp.m == 0 || lp.n == 0)
        glp_std_basis(lp);
    else
        cpx_basis(lp);
}

function new_node(tree, parent){
    /* pull a free slot for the new node */
    var p = get_slot(tree);
    /* create descriptor of the new subproblem */
    var node = {};
    tree.slot[p].node = node;
    node.p = p;
    node.up = parent;
    node.level = (parent == null ? 0 : parent.level + 1);
    node.count = 0;
    node.b_ptr = null;
    node.s_ptr = null;
    node.r_ptr = null;
    node.solved = 0;
    node.lp_obj = (parent == null ? (tree.mip.dir == GLP_MIN ?
        -DBL_MAX : +DBL_MAX) : parent.lp_obj);
    node.bound = (parent == null ? (tree.mip.dir == GLP_MIN ?
        -DBL_MAX : +DBL_MAX) : parent.bound);
    node.br_var = 0;
    node.br_val = 0.0;
    node.ii_cnt = 0;
    node.ii_sum = 0.0;
    node.changed = 0;
    if (tree.parm.cb_size == 0)
        node.data = null;
    else
    {
        node.data = {};
    }
    node.temp = null;
    node.prev = tree.tail;
    node.next = null;
    /* add the new subproblem to the end of the active list */
    if (tree.head == null)
        tree.head = node;
    else
        tree.tail.next = node;
    tree.tail = node;
    tree.a_cnt++;
    tree.n_cnt++;
    tree.t_cnt++;
    /* increase the number of child subproblems */
    if (parent == null)
        xassert(p == 1);
    else
        parent.count++;
    return node;
}

function get_slot(tree){
    var p;
    /* if no free slots are available, increase the room */
    if (tree.avail == 0)
    {  var nslots = tree.nslots;
        var save = tree.slot;
        if (nslots == 0)
            tree.nslots = 20;
        else
        {  tree.nslots = nslots + nslots;
            xassert(tree.nslots > nslots);
        }
        tree.slot = new Array(1+tree.nslots);
        xfillObjArr(tree.slot, 0, 1+tree.nslots);
        if (save != null)
        {
            xcopyArr(tree.slot, 1, save, 1, nslots);
        }
        /* push more free slots into the stack */
        for (p = tree.nslots; p > nslots; p--)
        {  tree.slot[p].node = null;
            tree.slot[p].next = tree.avail;
            tree.avail = p;
        }
    }
    /* pull a free slot from the stack */
    p = tree.avail;
    tree.avail = tree.slot[p].next;
    xassert(tree.slot[p].node == null);
    tree.slot[p].next = 0;
    return p;
}

function ios_create_tree(mip, parm){
    var m = mip.m;
    var n = mip.n;
    var tree;
    var i, j;
    xassert(mip.tree == null);
    mip.tree = tree = {};
    tree.n = n;
    /* save original problem components */
    tree.orig_m = m;
    tree.orig_type = new Array(1+m+n);
    tree.orig_lb = new Array(1+m+n);
    tree.orig_ub = new Array(1+m+n);
    tree.orig_stat = new Array(1+m+n);
    tree.orig_prim = new Array(1+m+n);
    tree.orig_dual = new Array(1+m+n);
    for (i = 1; i <= m; i++)
    {  var row = mip.row[i];
        tree.orig_type[i] = row.type;
        tree.orig_lb[i] = row.lb;
        tree.orig_ub[i] = row.ub;
        tree.orig_stat[i] = row.stat;
        tree.orig_prim[i] = row.prim;
        tree.orig_dual[i] = row.dual;
    }
    for (j = 1; j <= n; j++)
    {  var col = mip.col[j];
        tree.orig_type[m+j] = col.type;
        tree.orig_lb[m+j] = col.lb;
        tree.orig_ub[m+j] = col.ub;
        tree.orig_stat[m+j] = col.stat;
        tree.orig_prim[m+j] = col.prim;
        tree.orig_dual[m+j] = col.dual;
    }
    tree.orig_obj = mip.obj_val;
    /* initialize the branch-and-bound tree */
    tree.nslots = 0;
    tree.avail = 0;
    tree.slot = null;
    tree.head = tree.tail = null;
    tree.a_cnt = tree.n_cnt = tree.t_cnt = 0;
    /* the root subproblem is not solved yet, so its final components
     are unknown so far */
    tree.root_m = 0;
    tree.root_type = null;
    tree.root_lb = tree.root_ub = null;
    tree.root_stat = null;
    /* the current subproblem does not exist yet */
    tree.curr = null;
    tree.mip = mip;
    /*tree.solved = 0;*/
    tree.non_int = new Array(1+n);
    xfillArr(tree.non_int, 1, 0, n);
    /* arrays to save parent subproblem components will be allocated
     later */
    tree.pred_m = tree.pred_max = 0;
    tree.pred_type = null;
    tree.pred_lb = tree.pred_ub = null;
    tree.pred_stat = null;
    /* cut generator */
    tree.local = ios_create_pool(tree);
    /*tree.first_attempt = 1;*/
    /*tree.max_added_cuts = 0;*/
    /*tree.min_eff = 0.0;*/
    /*tree.miss = 0;*/
    /*tree.just_selected = 0;*/
    tree.mir_gen = null;
    tree.clq_gen = null;
    /*tree.round = 0;*/
    /* pseudocost branching */
    tree.pcost = null;
    tree.iwrk = new Array(1+n);
    tree.dwrk = new Array(1+n);
    /* initialize control parameters */
    tree.parm = parm;
    tree.tm_beg = xtime();
    tree.tm_lag = 0;
    tree.sol_cnt = 0;
    /* initialize advanced solver interface */
    tree.reason = 0;
    tree.reopt = 0;
    tree.reinv = 0;
    tree.br_var = 0;
    tree.br_sel = 0;
    tree.child = 0;
    tree.next_p = 0;
    /*tree.btrack = null;*/
    tree.stop = 0;
    /* create the root subproblem, which initially is identical to
     the original MIP */
    new_node(tree, null);
    return tree;
}

function ios_revive_node(tree, p){
    var mip = tree.mip;
    var node, root;
    var b, r, s, a;
    /* obtain pointer to the specified subproblem */
    xassert(1 <= p && p <= tree.nslots);
    node = tree.slot[p].node;
    xassert(node != null);
    /* the specified subproblem must be active */
    xassert(node.count == 0);
    /* the current subproblem must not exist */
    xassert(tree.curr == null);
    /* the specified subproblem becomes current */
    tree.curr = node;
    /*tree.solved = 0;*/
    /* obtain pointer to the root subproblem */
    root = tree.slot[1].node;
    xassert(root != null);
    /* at this point problem object components correspond to the root
     subproblem, so if the root subproblem should be revived, there
     is nothing more to do */
    if (node == root) return;
    xassert(mip.m == tree.root_m);
    /* build path from the root to the current node */
    node.temp = null;
    for (; node != null; node = node.up)
    {  if (node.up == null)
        xassert(node == root);
    else
        node.up.temp = node;
    }
    /* go down from the root to the current node and make necessary
     changes to restore components of the current subproblem */
    for (node = root; node != null; node = node.temp)
    {  var m = mip.m;
        var n = mip.n;
        /* if the current node is reached, the problem object at this
         point corresponds to its parent, so save attributes of rows
         and columns for the parent subproblem */
        if (node.temp == null)
        {   var i, j;
            tree.pred_m = m;
            /* allocate/reallocate arrays, if necessary */
            if (tree.pred_max < m + n)
            {  var new_size = m + n + 100;
                tree.pred_max = new_size;
                tree.pred_type = new Array(1+new_size);
                tree.pred_lb = new Array(1+new_size);
                tree.pred_ub = new Array(1+new_size);
                tree.pred_stat = new Array(1+new_size);
            }
            /* save row attributes */
            for (i = 1; i <= m; i++)
            {  var row = mip.row[i];
                tree.pred_type[i] = row.type;
                tree.pred_lb[i] = row.lb;
                tree.pred_ub[i] = row.ub;
                tree.pred_stat[i] = row.stat;
            }
            /* save column attributes */
            for (j = 1; j <= n; j++)
            {  var col = mip.col[j];
                tree.pred_type[mip.m+j] = col.type;
                tree.pred_lb[mip.m+j] = col.lb;
                tree.pred_ub[mip.m+j] = col.ub;
                tree.pred_stat[mip.m+j] = col.stat;
            }
        }
        /* change bounds of rows and columns */
        {   for (b = node.b_ptr; b != null; b = b.next)
        {  if (b.k <= m)
            glp_set_row_bnds(mip, b.k, b.type, b.lb, b.ub);
        else
            glp_set_col_bnds(mip, b.k-m, b.type, b.lb, b.ub);
        }
        }
        /* change statuses of rows and columns */
        {   for (s = node.s_ptr; s != null; s = s.next)
        {  if (s.k <= m)
            glp_set_row_stat(mip, s.k, s.stat);
        else
            glp_set_col_stat(mip, s.k-m, s.stat);
        }
        }
        /* add new rows */
        if (node.r_ptr != null)
        {
            var len, ind;
            var val;
            ind = new Array(1+n);
            val = new Array(1+n);
            for (r = node.r_ptr; r != null; r = r.next)
            {  i = glp_add_rows(mip, 1);
                glp_set_row_name(mip, i, r.name);
                xassert(mip.row[i].level == 0);
                mip.row[i].level = node.level;
                mip.row[i].origin = r.origin;
                mip.row[i].klass = r.klass;
                glp_set_row_bnds(mip, i, r.type, r.lb, r.ub);
                len = 0;
                for (a = r.ptr; a != null; a = a.next){
                    len++; ind[len] = a.j; val[len] = a.val;
                }
                glp_set_mat_row(mip, i, len, ind, val);
                glp_set_rii(mip, i, r.rii);
                glp_set_row_stat(mip, i, r.stat);
            }
        }
    }
    /* the specified subproblem has been revived */
    node = tree.curr;
    /* delete its bound change list */
    while (node.b_ptr != null)
    {   b = node.b_ptr;
        node.b_ptr = b.next;
    }
    /* delete its status change list */
    while (node.s_ptr != null)
    {   s = node.s_ptr;
        node.s_ptr = s.next;
    }
    /* delete its row addition list (additional rows may appear, for
     example, due to branching on GUB constraints */
    while (node.r_ptr != null)
    {   r = node.r_ptr;
        node.r_ptr = r.next;
        xassert(r.name == null);
        while (r.ptr != null)
        {   a = r.ptr;
            r.ptr = a.next;
        }
    }
}

function ios_freeze_node(tree){
    var mip = tree.mip;
    var m = mip.m;
    var n = mip.n;
    /* obtain pointer to the current subproblem */
    var node = tree.curr;
    xassert(node != null);


    var k, i, row, col;
    if (node.up == null)
    {  /* freeze the root subproblem */
        xassert(node.p == 1);
        xassert(tree.root_m == 0);
        xassert(tree.root_type == null);
        xassert(tree.root_lb == null);
        xassert(tree.root_ub == null);
        xassert(tree.root_stat == null);
        tree.root_m = m;
        tree.root_type = new Array(1+m+n);
        tree.root_lb = new Array(1+m+n);
        tree.root_ub = new Array(1+m+n);
        tree.root_stat = new Array(1+m+n);
        for (k = 1; k <= m+n; k++)
        {  if (k <= m)
        {   row = mip.row[k];
            tree.root_type[k] = row.type;
            tree.root_lb[k] = row.lb;
            tree.root_ub[k] = row.ub;
            tree.root_stat[k] = row.stat;
        }
        else
        {   col = mip.col[k-m];
            tree.root_type[k] = col.type;
            tree.root_lb[k] = col.lb;
            tree.root_ub[k] = col.ub;
            tree.root_stat[k] = col.stat;
        }
        }
    }
    else
    {  /* freeze non-root subproblem */
        var root_m = tree.root_m;
        var pred_m = tree.pred_m;
        var j;
        xassert(pred_m <= m);
        /* build change lists for rows and columns which exist in the
         parent subproblem */
        xassert(node.b_ptr == null);
        xassert(node.s_ptr == null);
        for (k = 1; k <= pred_m + n; k++)
        {  var pred_type, pred_stat, type, stat;
            var pred_lb, pred_ub, lb, ub;
            /* determine attributes in the parent subproblem */
            pred_type = tree.pred_type[k];
            pred_lb = tree.pred_lb[k];
            pred_ub = tree.pred_ub[k];
            pred_stat = tree.pred_stat[k];
            /* determine attributes in the current subproblem */
            if (k <= pred_m)
            {   row = mip.row[k];
                type = row.type;
                lb = row.lb;
                ub = row.ub;
                stat = row.stat;
            }
            else
            {   col = mip.col[k - pred_m];
                type = col.type;
                lb = col.lb;
                ub = col.ub;
                stat = col.stat;
            }
            /* save type and bounds of a row/column, if changed */
            if (!(pred_type == type && pred_lb == lb && pred_ub == ub))
            {   var b = {};
                b.k = k;
                b.type = type;
                b.lb = lb;
                b.ub = ub;
                b.next = node.b_ptr;
                node.b_ptr = b;
            }
            /* save status of a row/column, if changed */
            if (pred_stat != stat)
            {   var s = {};
                s.k = k;
                s.stat = stat;
                s.next = node.s_ptr;
                node.s_ptr = s;
            }
        }
        /* save new rows added to the current subproblem */
        xassert(node.r_ptr == null);
        if (pred_m < m)
        {  var len, ind;
            var val;
            ind = new Array(1+n);
            val = new Array(1+n);
            for (i = m; i > pred_m; i--)
            {   row = mip.row[i];
                var r = {};
                var name = glp_get_row_name(mip, i);
                if (name == null)
                    r.name = null;
                else
                {
                    r.name = name;
                }
                r.type = row.type;
                r.lb = row.lb;
                r.ub = row.ub;
                r.ptr = null;
                len = glp_get_mat_row(mip, i, ind, val);
                for (k = 1; k <= len; k++)
                {
                    var a = {};
                    a.j = ind[k];
                    a.val = val[k];
                    a.next = r.ptr;
                    r.ptr = a;
                }
                r.rii = row.rii;
                r.stat = row.stat;
                r.next = node.r_ptr;
                node.r_ptr = r;
            }
        }
        /* remove all rows missing in the root subproblem */
        if (m != root_m)
        {
            var nrs = m - root_m;
            xassert(nrs > 0);
            var num = new Array(1+nrs);
            for (i = 1; i <= nrs; i++) num[i] = root_m + i;
            glp_del_rows(mip, nrs, num);
        }
        m = mip.m;
        /* and restore attributes of all rows and columns for the root
         subproblem */
        xassert(m == root_m);
        for (i = 1; i <= m; i++)
        {  glp_set_row_bnds(mip, i, tree.root_type[i],
            tree.root_lb[i], tree.root_ub[i]);
            glp_set_row_stat(mip, i, tree.root_stat[i]);
        }
        for (j = 1; j <= n; j++)
        {  glp_set_col_bnds(mip, j, tree.root_type[m+j],
            tree.root_lb[m+j], tree.root_ub[m+j]);
            glp_set_col_stat(mip, j, tree.root_stat[m+j]);
        }
    }
    /* the current subproblem has been frozen */
    tree.curr = null;
}

function ios_clone_node(tree, p, nnn, ref){
    var node, k;
    /* obtain pointer to the subproblem to be cloned */
    xassert(1 <= p && p <= tree.nslots);
    node = tree.slot[p].node;
    xassert(node != null);
    /* the specified subproblem must be active */
    xassert(node.count == 0);
    /* and must be in the frozen state */
    xassert(tree.curr != node);
    /* remove the specified subproblem from the active list, because
     it becomes inactive */
    if (node.prev == null)
        tree.head = node.next;
    else
        node.prev.next = node.next;
    if (node.next == null)
        tree.tail = node.prev;
    else
        node.next.prev = node.prev;
    node.prev = node.next = null;
    tree.a_cnt--;
    /* create clone subproblems */
    xassert(nnn > 0);
    for (k = 1; k <= nnn; k++)
        ref[k] = new_node(tree, node).p;
}

function ios_delete_node(tree, p){
    var node, temp;
    /* obtain pointer to the subproblem to be deleted */
    xassert(1 <= p && p <= tree.nslots);
    node = tree.slot[p].node;
    xassert(node != null);
    /* the specified subproblem must be active */
    xassert(node.count == 0);
    /* and must be in the frozen state */
    xassert(tree.curr != node);
    /* remove the specified subproblem from the active list, because
     it is gone from the tree */
    if (node.prev == null)
        tree.head = node.next;
    else
        node.prev.next = node.next;
    if (node.next == null)
        tree.tail = node.prev;
    else
        node.next.prev = node.prev;
    node.prev = node.next = null;
    tree.a_cnt--;
    while (true){
        /* recursive deletion starts here */
        /* delete the bound change list */
        {  var b;
            while (node.b_ptr != null)
            {  b = node.b_ptr;
                node.b_ptr = b.next;
            }
        }
        /* delete the status change list */
        {  var s;
            while (node.s_ptr != null)
            {  s = node.s_ptr;
                node.s_ptr = s.next;
            }
        }
        /* delete the row addition list */
        while (node.r_ptr != null)
        {  var r;
            r = node.r_ptr;
            r.name = null;
            while (r.ptr != null)
            {  var a;
                a = r.ptr;
                r.ptr = a.next;
            }
            node.r_ptr = r.next;
        }
        /* free application-specific data */
        if (tree.parm.cb_size == 0)
            xassert(node.data == null);
        /* free the corresponding node slot */
        p = node.p;
        xassert(tree.slot[p].node == node);
        tree.slot[p].node = null;
        tree.slot[p].next = tree.avail;
        tree.avail = p;
        /* save pointer to the parent subproblem */
        temp = node.up;
        /* delete the subproblem descriptor */
        tree.n_cnt--;
        /* take pointer to the parent subproblem */
        node = temp;
        if (node != null)
        {  /* the parent subproblem exists; decrease the number of its
         child subproblems */
            xassert(node.count > 0);
            node.count--;
            /* if now the parent subproblem has no childs, it also must be
             deleted */
            if (node.count == 0) continue;
        }
        break;
    }
}

function ios_delete_tree(tree){
    var mip = tree.mip;
    var i, j;
    var m = mip.m;
    var n = mip.n;
    xassert(mip.tree == tree);
    /* remove all additional rows */
    if (m != tree.orig_m)
    {  var nrs, num;
        nrs = m - tree.orig_m;
        xassert(nrs > 0);
        num = new Array(1+nrs);
        for (i = 1; i <= nrs; i++) num[i] = tree.orig_m + i;
        glp_del_rows(mip, nrs, num);
    }
    m = tree.orig_m;
    /* restore original attributes of rows and columns */
    xassert(m == tree.orig_m);
    xassert(n == tree.n);
    for (i = 1; i <= m; i++)
    {  glp_set_row_bnds(mip, i, tree.orig_type[i],
        tree.orig_lb[i], tree.orig_ub[i]);
        glp_set_row_stat(mip, i, tree.orig_stat[i]);
        mip.row[i].prim = tree.orig_prim[i];
        mip.row[i].dual = tree.orig_dual[i];
    }
    for (j = 1; j <= n; j++)
    {  glp_set_col_bnds(mip, j, tree.orig_type[m+j],
        tree.orig_lb[m+j], tree.orig_ub[m+j]);
        glp_set_col_stat(mip, j, tree.orig_stat[m+j]);
        mip.col[j].prim = tree.orig_prim[m+j];
        mip.col[j].dual = tree.orig_dual[m+j];
    }
    mip.pbs_stat = mip.dbs_stat = GLP_FEAS;
    mip.obj_val = tree.orig_obj;
    /* delete the branch-and-bound tree */
    xassert(tree.local != null);
    ios_delete_pool(tree.local);
    xassert(tree.mir_gen == null);
    xassert(tree.clq_gen == null);
    mip.tree = null;
}

function ios_eval_degrad(tree, j, callback){
    var mip = tree.mip;
    var m = mip.m;
    var n = mip.n;
    var len, kase, k, t, stat;
    var alfa, beta, gamma, delta, dz;
    var ind = tree.iwrk;
    var val = tree.dwrk;
    var dn, up;

    /* current basis must be optimal */
    xassert(glp_get_status(mip) == GLP_OPT);
    /* basis factorization must exist */
    xassert(glp_bf_exists(mip));
    /* obtain (fractional) value of x[j] in optimal basic solution
     to LP relaxation of the current subproblem */
    xassert(1 <= j && j <= n);
    beta = mip.col[j].prim;
    /* since the value of x[j] is fractional, it is basic; compute
     corresponding row of the simplex table */
    len = lpx_eval_tab_row(mip, m+j, ind, val);
    /* kase < 0 means down-branch; kase > 0 means up-branch */
    for (kase = -1; kase <= +1; kase += 2)
    {  /* for down-branch we introduce new upper bound floor(beta)
     for x[j]; similarly, for up-branch we introduce new lower
     bound ceil(beta) for x[j]; in the current basis this new
     upper/lower bound is violated, so in the adjacent basis
     x[j] will leave the basis and go to its new upper/lower
     bound; we need to know which non-basic variable x[k] should
     enter the basis to keep dual feasibility */
        k = lpx_dual_ratio_test(mip, len, ind, val, kase, 1e-9);
        /* if no variable has been chosen, current basis being primal
         infeasible due to the new upper/lower bound of x[j] is dual
         unbounded, therefore, LP relaxation to corresponding branch
         has no primal feasible solution */
        if (k == 0)
        {  if (mip.dir == GLP_MIN)
        {  if (kase < 0)
            dn = +DBL_MAX;
        else
            up = +DBL_MAX;
        }
        else if (mip.dir == GLP_MAX)
        {  if (kase < 0)
            dn = -DBL_MAX;
        else
            up = -DBL_MAX;
        }
        else
            xassert(mip != mip);
            continue;
        }
        xassert(1 <= k && k <= m+n);
        /* row of the simplex table corresponding to specified basic
         variable x[j] is the following:
         x[j] = ... + alfa * x[k] + ... ;
         we need to know influence coefficient, alfa, at non-basic
         variable x[k] chosen with the dual ratio test */
        for (t = 1; t <= len; t++)
            if (ind[t] == k) break;
        xassert(1 <= t && t <= len);
        alfa = val[t];
        /* determine status and reduced cost of variable x[k] */
        if (k <= m)
        {  stat = mip.row[k].stat;
            gamma = mip.row[k].dual;
        }
        else
        {  stat = mip.col[k-m].stat;
            gamma = mip.col[k-m].dual;
        }
        /* x[k] cannot be basic or fixed non-basic */
        xassert(stat == GLP_NL || stat == GLP_NU || stat == GLP_NF);
        /* if the current basis is dual degenerative, some reduced
         costs, which are close to zero, may have wrong sign due to
         round-off errors, so correct the sign of gamma */
        if (mip.dir == GLP_MIN)
        {  if (stat == GLP_NL && gamma < 0.0 ||
            stat == GLP_NU && gamma > 0.0 ||
            stat == GLP_NF) gamma = 0.0;
        }
        else if (mip.dir == GLP_MAX)
        {  if (stat == GLP_NL && gamma > 0.0 ||
            stat == GLP_NU && gamma < 0.0 ||
            stat == GLP_NF) gamma = 0.0;
        }
        else
            xassert(mip != mip);
        /* determine the change of x[j] in the adjacent basis:
         delta x[j] = new x[j] - old x[j] */
        delta = (kase < 0 ? Math.floor(beta) : Math.ceil(beta)) - beta;
        /* compute the change of x[k] in the adjacent basis:
         delta x[k] = new x[k] - old x[k] = delta x[j] / alfa */
        delta /= alfa;
        /* compute the change of the objective in the adjacent basis:
         delta z = new z - old z = gamma * delta x[k] */
        dz = gamma * delta;
        if (mip.dir == GLP_MIN)
            xassert(dz >= 0.0);
        else if (mip.dir == GLP_MAX)
            xassert(dz <= 0.0);
        else
            xassert(mip != mip);
        /* compute the new objective value in the adjacent basis:
         new z = old z + delta z */
        if (kase < 0)
            dn = mip.obj_val + dz;
        else
            up = mip.obj_val + dz;
    }
    callback(dn, up);
    /*xprintf("obj = %g; dn = %g; up = %g",
     mip.obj_val, *dn, *up);*/
}

function ios_round_bound(tree, bound){
    var mip = tree.mip;
    var n = mip.n;
    var d, j, nn;
    var c = tree.iwrk;
    var s, h;
    /* determine c[j] and compute s */
    nn = 0; s = mip.c0; d = 0;
    for (j = 1; j <= n; j++)
    {  var col = mip.col[j];
        if (col.coef == 0.0) continue;
        if (col.type == GLP_FX)
        {  /* fixed variable */
            s += col.coef * col.prim;
        }
        else
        {  /* non-fixed variable */
            if (col.kind != GLP_IV) return bound;
            if (col.coef != Math.floor(col.coef)) return bound;
            if (Math.abs(col.coef) <= INT_MAX)
                c[++nn] = Math.abs(col.coef);
            else
                d = 1;
        }
    }
    /* compute d = gcd(c[1],...c[nn]) */
    if (d == 0)
    {  if (nn == 0) return bound;
        d = gcdn(nn, c);
    }
    xassert(d > 0);
    /* compute new local bound */
    if (mip.dir == GLP_MIN)
    {  if (bound != +DBL_MAX)
    {  h = (bound - s) / d;
        if (h >= Math.floor(h) + 0.001)
        {  /* round up */
            h = Math.ceil(h);
            /*xprintf("d = %d; old = %g; ", d, bound);*/
            bound = d * h + s;
            /*xprintf("new = %g", bound);*/
        }
    }
    }
    else if (mip.dir == GLP_MAX)
    {  if (bound != -DBL_MAX)
    {  h = (bound - s) / d;
        if (h <= Math.ceil(h) - 0.001)
        {  /* round down */
            h = Math.floor(h);
            bound = d * h + s;
        }
    }
    }
    else
        xassert(mip != mip);
    return bound;
}

function ios_is_hopeful(tree, bound){
    var mip = tree.mip;
    var ret = 1;
    var eps;
    if (mip.mip_stat == GLP_FEAS)
    {  eps = tree.parm.tol_obj * (1.0 + Math.abs(mip.mip_obj));
        switch (mip.dir)
        {  case GLP_MIN:
            if (bound >= mip.mip_obj - eps) ret = 0;
            break;
            case GLP_MAX:
                if (bound <= mip.mip_obj + eps) ret = 0;
                break;
            default:
                xassert(mip != mip);
        }
    }
    else
    {  switch (mip.dir)
    {  case GLP_MIN:
            if (bound == +DBL_MAX) ret = 0;
            break;
        case GLP_MAX:
            if (bound == -DBL_MAX) ret = 0;
            break;
        default:
            xassert(mip != mip);
    }
    }
    return ret;
}

function ios_best_node(tree){
    var node, best = null;
    switch (tree.mip.dir)
    {  case GLP_MIN:
        /* minimization */
        for (node = tree.head; node != null; node = node.next)
            if (best == null || best.bound > node.bound)
                best = node;
        break;
        case GLP_MAX:
            /* maximization */
            for (node = tree.head; node != null; node = node.next)
                if (best == null || best.bound < node.bound)
                    best = node;
            break;
        default:
            xassert(tree != tree);
    }
    return best == null ? 0 : best.p;
}

function ios_relative_gap(tree){
    var mip = tree.mip;
    var p;
    var best_mip, best_bnd, gap;
    if (mip.mip_stat == GLP_FEAS)
    {  best_mip = mip.mip_obj;
        p = ios_best_node(tree);
        if (p == 0)
        {  /* the tree is empty */
            gap = 0.0;
        }
        else
        {  best_bnd = tree.slot[p].node.bound;
            gap = Math.abs(best_mip - best_bnd) / (Math.abs(best_mip) +
                DBL_EPSILON);
        }
    }
    else
    {  /* no integer feasible solution has been found yet */
        gap = DBL_MAX;
    }
    return gap;
}

function ios_solve_node(tree){
    var mip = tree.mip;
    var parm = {};
    var ret;
    /* the current subproblem must exist */
    xassert(tree.curr != null);
    /* set some control parameters */
    glp_init_smcp(parm);
    switch (tree.parm.msg_lev)
    {  case GLP_MSG_OFF:
        parm.msg_lev = GLP_MSG_OFF; break;
        case GLP_MSG_ERR:
            parm.msg_lev = GLP_MSG_ERR; break;
        case GLP_MSG_ON:
        case GLP_MSG_ALL:
            parm.msg_lev = GLP_MSG_ON; break;
        case GLP_MSG_DBG:
            parm.msg_lev = GLP_MSG_ALL; break;
        default:
            xassert(tree != tree);
    }
    parm.meth = GLP_DUALP;
    if (tree.parm.msg_lev < GLP_MSG_DBG)
        parm.out_dly = tree.parm.out_dly;
    else
        parm.out_dly = 0;
    /* if the incumbent objective value is already known, use it to
     prematurely terminate the dual simplex search */
    if (mip.mip_stat == GLP_FEAS)
    {  switch (tree.mip.dir)
    {  case GLP_MIN:
            parm.obj_ul = mip.mip_obj;
            break;
        case GLP_MAX:
            parm.obj_ll = mip.mip_obj;
            break;
        default:
            xassert(mip != mip);
    }
    }
    /* try to solve/re-optimize the LP relaxation */
    ret = glp_simplex(mip, parm);
    tree.curr.solved++;
    return ret;
}

function ios_create_pool(tree){
    /* create cut pool */
    xassert(tree == tree);
    var pool = {};
    pool.size = 0;
    pool.head = pool.tail = null;
    pool.ord = 0; pool.curr = null;
    return pool;
}

function ios_add_row(tree, pool, name, klass, flags, len, ind, val, type, rhs){
    /* add row (constraint) to the cut pool */
    var cut, aij, k;
    xassert(pool != null);
    cut = {};
    if (name == null || name[0] == '\0')
        cut.name = null;
    else
    {
        cut.name = name;
    }
    if (!(0 <= klass && klass <= 255))
        xerror("glp_ios_add_row: klass = " + klass + "; invalid cut class");
    cut.klass = klass;
    if (flags != 0)
        xerror("glp_ios_add_row: flags = " + flags + "; invalid cut flags");
    cut.ptr = null;
    if (!(0 <= len && len <= tree.n))
        xerror("glp_ios_add_row: len = " + len + "; invalid cut length");
    for (k = 1; k <= len; k++)
    {  aij = {};
        if (!(1 <= ind[k] && ind[k] <= tree.n))
            xerror("glp_ios_add_row: ind[" + k + "] = " + ind[k] + "; column index out of range");
        aij.j = ind[k];
        aij.val = val[k];
        aij.next = cut.ptr;
        cut.ptr = aij;
    }
    if (!(type == GLP_LO || type == GLP_UP || type == GLP_FX))
        xerror("glp_ios_add_row: type = " + type + "; invalid cut type");
    cut.type = type;
    cut.rhs = rhs;
    cut.prev = pool.tail;
    cut.next = null;
    if (cut.prev == null)
        pool.head = cut;
    else
        cut.prev.next = cut;
    pool.tail = cut;
    pool.size++;
    return pool.size;
}

function ios_find_row(pool, i){
    /* find row (constraint) in the cut pool */
    /* (smart linear search) */
    xassert(pool != null);
    xassert(1 <= i && i <= pool.size);
    if (pool.ord == 0)
    {  xassert(pool.curr == null);
        pool.ord = 1;
        pool.curr = pool.head;
    }
    xassert(pool.curr != null);
    if (i < pool.ord)
    {  if (i < pool.ord - i)
    {  pool.ord = 1;
        pool.curr = pool.head;
        while (pool.ord != i)
        {  pool.ord++;
            xassert(pool.curr != null);
            pool.curr = pool.curr.next;
        }
    }
    else
    {  while (pool.ord != i)
    {  pool.ord--;
        xassert(pool.curr != null);
        pool.curr = pool.curr.prev;
    }
    }
    }
    else if (i > pool.ord)
    {  if (i - pool.ord < pool.size - i)
    {  while (pool.ord != i)
    {  pool.ord++;
        xassert(pool.curr != null);
        pool.curr = pool.curr.next;
    }
    }
    else
    {  pool.ord = pool.size;
        pool.curr = pool.tail;
        while (pool.ord != i)
        {  pool.ord--;
            xassert(pool.curr != null);
            pool.curr = pool.curr.prev;
        }
    }
    }
    xassert(pool.ord == i);
    xassert(pool.curr != null);
    return pool.curr;
}

function ios_del_row(pool, i){
    /* remove row (constraint) from the cut pool */
    var cut, aij;
    xassert(pool != null);
    if (!(1 <= i && i <= pool.size))
        xerror("glp_ios_del_row: i = " + i + "; cut number out of range");
    cut = ios_find_row(pool, i);
    xassert(pool.curr == cut);
    if (cut.next != null)
        pool.curr = cut.next;
    else if (cut.prev != null){
        pool.ord--; pool.curr = cut.prev;
    }
    else {
        pool.ord = 0; pool.curr = null;
    }
    if (cut.prev == null)
    {  xassert(pool.head == cut);
        pool.head = cut.next;
    }
    else
    {  xassert(cut.prev.next == cut);
        cut.prev.next = cut.next;
    }
    if (cut.next == null)
    {  xassert(pool.tail == cut);
        pool.tail = cut.prev;
    }
    else
    {  xassert(cut.next.prev == cut);
        cut.next.prev = cut.prev;
    }
    while (cut.ptr != null)
    {  aij = cut.ptr;
        cut.ptr = aij.next;
    }
    pool.size--;

}

function ios_clear_pool(pool){
    /* remove all rows (constraints) from the cut pool */
    xassert(pool != null);
    while (pool.head != null)
    {  var cut = pool.head;
        pool.head = cut.next;
        while (cut.ptr != null)
        {  var aij = cut.ptr;
            cut.ptr = aij.next;
        }
    }
    pool.size = 0;
    pool.head = pool.tail = null;
    pool.ord = 0;
    pool.curr = null;
}

function ios_delete_pool(pool){
    /* delete cut pool */
    xassert(pool != null);
    ios_clear_pool(pool);
}

function ios_preprocess_node(tree, max_pass){
    function prepare_row_info(n, a, l, u, f){
        var j, j_min, j_max;
        var f_min, f_max;
        xassert(n >= 0);
        /* determine f_min and j_min */
        f_min = 0.0; j_min = 0;
        for (j = 1; j <= n; j++)
        {  if (a[j] > 0.0)
        {  if (l[j] == -DBL_MAX)
        {  if (j_min == 0)
            j_min = j;
        else
        {  f_min = -DBL_MAX; j_min = 0;
            break;
        }
        }
        else
            f_min += a[j] * l[j];
        }
        else if (a[j] < 0.0)
        {  if (u[j] == +DBL_MAX)
        {  if (j_min == 0)
            j_min = j;
        else
        {  f_min = -DBL_MAX; j_min = 0;
            break;
        }
        }
        else
            f_min += a[j] * u[j];
        }
        else
            xassert(a != a);
        }
        f.f_min = f_min; f.j_min = j_min;
        /* determine f_max and j_max */
        f_max = 0.0; j_max = 0;
        for (j = 1; j <= n; j++)
        {  if (a[j] > 0.0)
        {  if (u[j] == +DBL_MAX)
        {  if (j_max == 0)
            j_max = j;
        else
        {  f_max = +DBL_MAX; j_max = 0;
            break;
        }
        }
        else
            f_max += a[j] * u[j];
        }
        else if (a[j] < 0.0)
        {  if (l[j] == -DBL_MAX)
        {  if (j_max == 0)
            j_max = j;
        else
        {  f_max = +DBL_MAX; j_max = 0;
            break;
        }
        }
        else
            f_max += a[j] * l[j];
        }
        else
            xassert(a != a);
        }
        f.f_max = f_max; f.j_max = j_max;
    }

    function row_implied_bounds(f, callback){
        callback((f.j_min == 0 ? f.f_min : -DBL_MAX), (f.j_max == 0 ? f.f_max : +DBL_MAX));
    }

    function col_implied_bounds(f, n, a, L, U, l, u, k, callback){
        var ilb, iub, ll, uu;
        xassert(n >= 0);
        xassert(1 <= k && k <= n);
        /* determine implied lower bound of term a[k] * x[k] (14) */
        if (L == -DBL_MAX || f.f_max == +DBL_MAX)
            ilb = -DBL_MAX;
        else if (f.j_max == 0)
        {  if (a[k] > 0.0)
        {  xassert(u[k] != +DBL_MAX);
            ilb = L - (f.f_max - a[k] * u[k]);
        }
        else if (a[k] < 0.0)
        {  xassert(l[k] != -DBL_MAX);
            ilb = L - (f.f_max - a[k] * l[k]);
        }
        else
            xassert(a != a);
        }
        else if (f.j_max == k)
            ilb = L - f.f_max;
        else
            ilb = -DBL_MAX;
        /* determine implied upper bound of term a[k] * x[k] (15) */
        if (U == +DBL_MAX || f.f_min == -DBL_MAX)
            iub = +DBL_MAX;
        else if (f.j_min == 0)
        {  if (a[k] > 0.0)
        {  xassert(l[k] != -DBL_MAX);
            iub = U - (f.f_min - a[k] * l[k]);
        }
        else if (a[k] < 0.0)
        {  xassert(u[k] != +DBL_MAX);
            iub = U - (f.f_min - a[k] * u[k]);
        }
        else
            xassert(a != a);
        }
        else if (f.j_min == k)
            iub = U - f.f_min;
        else
            iub = +DBL_MAX;
        /* determine implied bounds of x[k] (16) and (17) */
        /* do not use a[k] if it has small magnitude to prevent wrong
         implied bounds; for example, 1e-15 * x1 >= x2 + x3, where
         x1 >= -10, x2, x3 >= 0, would lead to wrong conclusion that
         x1 >= 0 */
        if (Math.abs(a[k]) < 1e-6){
            ll = -DBL_MAX;
            uu = +DBL_MAX
        } else if (a[k] > 0.0)
        {  ll = (ilb == -DBL_MAX ? -DBL_MAX : ilb / a[k]);
            uu = (iub == +DBL_MAX ? +DBL_MAX : iub / a[k]);
        }
        else if (a[k] < 0.0)
        {  ll = (iub == +DBL_MAX ? -DBL_MAX : iub / a[k]);
            uu = (ilb == -DBL_MAX ? +DBL_MAX : ilb / a[k]);
        }
        else
            xassert(a != a);
        callback(ll, uu);
    }

    function check_row_bounds(f, L_, Lx, U_, Ux){
        var eps, ret = 0;
        var L = L_[Lx], U = U_[Ux], LL = null, UU = null;
        /* determine implied bounds of the row */
        row_implied_bounds(f, function(a, b){LL = a; UU = b});
        /* check if the original lower bound is infeasible */
        if (L != -DBL_MAX)
        {   eps = 1e-3 * (1.0 + Math.abs(L));
            if (UU < L - eps)
            {  ret = 1;
                return ret;
            }
        }
        /* check if the original upper bound is infeasible */
        if (U != +DBL_MAX)
        {   eps = 1e-3 * (1.0 + Math.abs(U));
            if (LL > U + eps)
            {  ret = 1;
                return ret;
            }
        }
        /* check if the original lower bound is redundant */
        if (L != -DBL_MAX)
        {   eps = 1e-12 * (1.0 + Math.abs(L));
            if (LL > L - eps)
            {  /* it cannot be active, so remove it */
                L_[Lx] = -DBL_MAX;
            }
        }
        /* check if the original upper bound is redundant */
        if (U != +DBL_MAX)
        {   eps = 1e-12 * (1.0 + Math.abs(U));
            if (UU < U + eps)
            {  /* it cannot be active, so remove it */
                U_[Ux] = +DBL_MAX;
            }
        }
        return ret
    }

    function check_col_bounds(f, n, a, L, U, l, u, flag, j, callback){
        var eps, ret = 0;
        var lj, uj, ll = null, uu = null;
        xassert(n >= 0);
        xassert(1 <= j && j <= n);
        lj = l[j]; uj = u[j];
        /* determine implied bounds of the column */
        col_implied_bounds(f, n, a, L, U, l, u, j, function(a,b){ll = a; uu = b});
        /* if x[j] is integral, round its implied bounds */
        if (flag)
        {  if (ll != -DBL_MAX)
            ll = (ll - Math.floor(ll) < 1e-3 ? Math.floor(ll) : Math.ceil(ll));
            if (uu != +DBL_MAX)
                uu = (Math.ceil(uu) - uu < 1e-3 ? Math.ceil(uu) : Math.floor(uu));
        }
        /* check if the original lower bound is infeasible */
        if (lj != -DBL_MAX)
        {   eps = 1e-3 * (1.0 + Math.abs(lj));
            if (uu < lj - eps)
            {  ret = 1;
                return ret;
            }
        }
        /* check if the original upper bound is infeasible */
        if (uj != +DBL_MAX)
        {   eps = 1e-3 * (1.0 + Math.abs(uj));
            if (ll > uj + eps)
            {  ret = 1;
                return ret;
            }
        }
        /* check if the original lower bound is redundant */
        if (ll != -DBL_MAX)
        {   eps = 1e-3 * (1.0 + Math.abs(ll));
            if (lj < ll - eps)
            {  /* it cannot be active, so tighten it */
                lj = ll;
            }
        }
        /* check if the original upper bound is redundant */
        if (uu != +DBL_MAX)
        {   eps = 1e-3 * (1.0 + Math.abs(uu));
            if (uj > uu + eps)
            {  /* it cannot be active, so tighten it */
                uj = uu;
            }
        }
        /* due to round-off errors it may happen that lj > uj (although
         lj < uj + eps, since no primal infeasibility is detected), so
         adjuct the new actual bounds to provide lj <= uj */
        if (!(lj == -DBL_MAX || uj == +DBL_MAX))
        {   var t1 = Math.abs(lj), t2 = Math.abs(uj);
            eps = 1e-10 * (1.0 + (t1 <= t2 ? t1 : t2));
            if (lj > uj - eps)
            {  if (lj == l[j])
                uj = lj;
            else if (uj == u[j])
                lj = uj;
            else if (t1 <= t2)
                uj = lj;
            else
                lj = uj;
            }
        }
        callback(lj, uj);
        return ret;
    }

    function check_efficiency(flag, l, u, ll, uu){
        var r, eff = 0;
        /* check efficiency for lower bound */
        if (l < ll)
        {  if (flag || l == -DBL_MAX)
            eff++;
        else
        {
            if (u == +DBL_MAX)
                r = 1.0 + Math.abs(l);
            else
                r = 1.0 + (u - l);
            if (ll - l >= 0.25 * r)
                eff++;
        }
        }
        /* check efficiency for upper bound */
        if (u > uu)
        {  if (flag || u == +DBL_MAX)
            eff++;
        else
        {
            if (l == -DBL_MAX)
                r = 1.0 + Math.abs(u);
            else
                r = 1.0 + (u - l);
            if (u - uu >= 0.25 * r)
                eff++;
        }
        }
        return eff;
    }

    function basic_preprocessing(mip, L, U, l, u, nrs, num, max_pass){
        var m = mip.m;
        var n = mip.n;
        var f = {};
        var i, j, k, len, size, ret = 0;
        var ind, list, mark, pass;
        var val, lb, ub;
        var aij, col;
        xassert(0 <= nrs && nrs <= m+1);
        xassert(max_pass > 0);
        /* allocate working arrays */
        ind = new Array(1+n);
        list = new Array(1+m+1);
        mark = new Array(1+m+1);
        xfillArr(mark, 0, 0, m+1);
        pass = new Array(1+m+1);
        xfillArr(pass, 0, 0, m+1);
        val = new Array(1+n);
        lb = new Array(1+n);
        ub = new Array(1+n);
        /* initialize the list of rows to be processed */
        size = 0;
        for (k = 1; k <= nrs; k++)
        {  i = num[k];
            xassert(0 <= i && i <= m);
            /* duplicate row numbers are not allowed */
            xassert(!mark[i]);
            list[++size] = i; mark[i] = 1;
        }
        xassert(size == nrs);
        /* process rows in the list until it becomes empty */
        while (size > 0)
        {  /* get a next row from the list */
            i = list[size--]; mark[i] = 0;
            /* increase the row processing count */
            pass[i]++;
            /* if the row is free, skip it */
            if (L[i] == -DBL_MAX && U[i] == +DBL_MAX) continue;
            /* obtain coefficients of the row */
            len = 0;
            if (i == 0)
            {   for (j = 1; j <= n; j++)
            {   col = mip.col[j];
                if (col.coef != 0.0){
                    len++; ind[len] = j; val[len] = col.coef;
                }
            }
            }
            else
            {   var row = mip.row[i];
                for (aij = row.ptr; aij != null; aij = aij.r_next){
                    len++; ind[len] = aij.col.j; val[len] = aij.val;
                }
            }
            /* determine lower and upper bounds of columns corresponding
             to non-zero row coefficients */
            for (k = 1; k <= len; k++){
                j = ind[k]; lb[k] = l[j]; ub[k] = u[j];
            }
            /* prepare the row info to determine implied bounds */
            prepare_row_info(len, val, lb, ub, f);
            /* check and relax bounds of the row */
            if (check_row_bounds(f, L, i, U, i))
            {  /* the feasible region is empty */
                ret = 1;
                return ret;
            }
            /* if the row became free, drop it */
            if (L[i] == -DBL_MAX && U[i] == +DBL_MAX) continue;
            /* process columns having non-zero coefficients in the row */
            for (k = 1; k <= len; k++){
                var flag, eff;
                var ll = null, uu = null;
                /* take a next column in the row */
                j = ind[k]; col = mip.col[j];
                flag = col.kind != GLP_CV;
                /* check and tighten bounds of the column */
                if (check_col_bounds(f, len, val, L[i], U[i], lb, ub,
                    flag, k, function(a, b){ll = a; uu = b}))
                {  /* the feasible region is empty */
                    ret = 1;
                    return ret;
                }
                /* check if change in the column bounds is efficient */
                eff = check_efficiency(flag, l[j], u[j], ll, uu);
                /* set new actual bounds of the column */
                l[j] = ll; u[j] = uu;
                /* if the change is efficient, add all rows affected by the
                 corresponding column, to the list */
                if (eff > 0)
                {
                    for (aij = col.ptr; aij != null; aij = aij.c_next)
                    {  var ii = aij.row.i;
                        /* if the row was processed maximal number of times,
                         skip it */
                        if (pass[ii] >= max_pass) continue;
                        /* if the row is free, skip it */
                        if (L[ii] == -DBL_MAX && U[ii] == +DBL_MAX) continue;
                        /* put the row into the list */
                        if (mark[ii] == 0)
                        {  xassert(size <= m);
                            list[++size] = ii; mark[ii] = 1;
                        }
                    }
                }
            }
        }
        return ret;
    }

    var mip = tree.mip;
    var m = mip.m;
    var n = mip.n;
    var i, j, nrs, num, ret = 0;
    var L, U, l, u;
    /* the current subproblem must exist */
    xassert(tree.curr != null);
    /* determine original row bounds */
    L = new Array(1+m);
    U = new Array(1+m);
    switch (mip.mip_stat)
    {  case GLP_UNDEF:
        L[0] = -DBL_MAX; U[0] = +DBL_MAX;
        break;
        case GLP_FEAS:
            switch (mip.dir)
            {  case GLP_MIN:
                L[0] = -DBL_MAX; U[0] = mip.mip_obj - mip.c0;
                break;
                case GLP_MAX:
                    L[0] = mip.mip_obj - mip.c0; U[0] = +DBL_MAX;
                    break;
                default:
                    xassert(mip != mip);
            }
            break;
        default:
            xassert(mip != mip);
    }
    for (i = 1; i <= m; i++)
    {  L[i] = glp_get_row_lb(mip, i);
        U[i] = glp_get_row_ub(mip, i);
    }
    /* determine original column bounds */
    l = new Array(1+n);
    u = new Array(1+n);
    for (j = 1; j <= n; j++)
    {  l[j] = glp_get_col_lb(mip, j);
        u[j] = glp_get_col_ub(mip, j);
    }
    /* build the initial list of rows to be analyzed */
    nrs = m + 1;
    num = new Array(1+nrs);
    for (i = 1; i <= nrs; i++) num[i] = i - 1;
    /* perform basic preprocessing */
    if (basic_preprocessing(mip , L, U, l, u, nrs, num, max_pass))
    {  ret = 1;
        return ret;
    }
    /* set new actual (relaxed) row bounds */
    for (i = 1; i <= m; i++)
    {  /* consider only non-active rows to keep dual feasibility */
        if (glp_get_row_stat(mip, i) == GLP_BS)
        {  if (L[i] == -DBL_MAX && U[i] == +DBL_MAX)
            glp_set_row_bnds(mip, i, GLP_FR, 0.0, 0.0);
        else if (U[i] == +DBL_MAX)
            glp_set_row_bnds(mip, i, GLP_LO, L[i], 0.0);
        else if (L[i] == -DBL_MAX)
            glp_set_row_bnds(mip, i, GLP_UP, 0.0, U[i]);
        }
    }
    /* set new actual (tightened) column bounds */
    for (j = 1; j <= n; j++)
    {  var type;
        if (l[j] == -DBL_MAX && u[j] == +DBL_MAX)
            type = GLP_FR;
        else if (u[j] == +DBL_MAX)
            type = GLP_LO;
        else if (l[j] == -DBL_MAX)
            type = GLP_UP;
        else if (l[j] != u[j])
            type = GLP_DB;
        else
            type = GLP_FX;
        glp_set_col_bnds(mip, j, type, l[j], u[j]);
    }
    return ret;
}

function ios_driver(T){
    function show_progress(T, bingo){
        var p;
        var temp;
        var best_mip, best_bound, rho, rel_gap;
        /* format the best known integer feasible solution */
        if (T.mip.mip_stat == GLP_FEAS)
            best_mip = String(T.mip.mip_obj);
        else
            best_mip = "not found yet";
        /* determine reference number of an active subproblem whose local
         bound is best */
        p = ios_best_node(T);
        /* format the best bound */
        if (p == 0)
            best_bound = "tree is empty";
        else
        {  temp = T.slot[p].node.bound;
            if (temp == -DBL_MAX)
                best_bound = "-inf";
            else if (temp == +DBL_MAX)
                best_bound = "+inf";
            else
                best_bound = temp;
        }
        /* choose the relation sign between global bounds */
        if (T.mip.dir == GLP_MIN)
            rho = ">=";
        else if (T.mip.dir == GLP_MAX)
            rho = "<=";
        else
            xassert(T != T);
        /* format the relative mip gap */
        temp = ios_relative_gap(T);
        if (temp == 0.0)
            rel_gap = "  0.0%%";
        else if (temp < 0.001)
            rel_gap = " < 0.1%%";
        else if (temp <= 9.999)
            rel_gap = 100.0 * temp;
        else
            rel_gap = "";
        /* display progress of the search */
        xprintf("+" + T.mip.it_cnt + ": " + (bingo ? ">>>>>" : "mip =") + " " + best_mip + " " + rho + " " + best_bound
            + " " + rel_gap + " (" + T.a_cnt + "; " + (T.t_cnt - T.n_cnt) + ")");
        T.tm_lag = xtime();
    }

    function is_branch_hopeful(T, p){
        xassert(1 <= p && p <= T.nslots);
        xassert(T.slot[p].node != null);
        return ios_is_hopeful(T, T.slot[p].node.bound);
    }

    function check_integrality(T){
        var mip = T.mip;
        var j, type, ii_cnt = 0;
        var lb, ub, x, temp1, temp2, ii_sum = 0.0;
        /* walk through the set of columns (structural variables) */
        for (j = 1; j <= mip.n; j++)
        {  var col = mip.col[j];
            T.non_int[j] = 0;
            /* if the column is not integer, skip it */
            if (col.kind != GLP_IV) continue;
            /* if the column is non-basic, it is integer feasible */
            if (col.stat != GLP_BS) continue;
            /* obtain the type and bounds of the column */
            type = col.type; lb = col.lb; ub = col.ub;
            /* obtain value of the column in optimal basic solution */
            x = col.prim;
            /* if the column's primal value is close to the lower bound,
             the column is integer feasible within given tolerance */
            if (type == GLP_LO || type == GLP_DB || type == GLP_FX)
            {  temp1 = lb - T.parm.tol_int;
                temp2 = lb + T.parm.tol_int;
                if (temp1 <= x && x <= temp2) continue;
                if (x < lb) continue;
            }
            /* if the column's primal value is close to the upper bound,
             the column is integer feasible within given tolerance */
            if (type == GLP_UP || type == GLP_DB || type == GLP_FX)
            {  temp1 = ub - T.parm.tol_int;
                temp2 = ub + T.parm.tol_int;
                if (temp1 <= x && x <= temp2) continue;
                if (x > ub) continue;
            }
            /* if the column's primal value is close to nearest integer,
             the column is integer feasible within given tolerance */
            temp1 = Math.floor(x + 0.5) - T.parm.tol_int;
            temp2 = Math.floor(x + 0.5) + T.parm.tol_int;
            if (temp1 <= x && x <= temp2) continue;
            /* otherwise the column is integer infeasible */
            T.non_int[j] = 1;
            /* increase the number of fractional-valued columns */
            ii_cnt++;
            /* compute the sum of integer infeasibilities */
            temp1 = x - Math.floor(x);
            temp2 = Math.ceil(x) - x;
            xassert(temp1 > 0.0 && temp2 > 0.0);
            ii_sum += (temp1 <= temp2 ? temp1 : temp2);
        }
        /* store ii_cnt and ii_sum to the current problem descriptor */
        xassert(T.curr != null);
        T.curr.ii_cnt = ii_cnt;
        T.curr.ii_sum = ii_sum;
        /* and also display these parameters */
        if (T.parm.msg_lev >= GLP_MSG_DBG)
        {  if (ii_cnt == 0)
            xprintf("There are no fractional columns");
        else if (ii_cnt == 1)
            xprintf("There is one fractional column, integer infeasibility is " + ii_sum + "");
        else
            xprintf("There are " + ii_cnt + " fractional columns, integer infeasibility is " + ii_sum + "");
        }
    }

    function record_solution(T){
        var mip = T.mip;
        var i, j;
        mip.mip_stat = GLP_FEAS;
        mip.mip_obj = mip.obj_val;
        for (i = 1; i <= mip.m; i++)
        {  var row = mip.row[i];
            row.mipx = row.prim;
        }
        for (j = 1; j <= mip.n; j++)
        {  var col = mip.col[j];
            if (col.kind == GLP_CV)
                col.mipx = col.prim;
            else if (col.kind == GLP_IV)
            {  /* value of the integer column must be integral */
                col.mipx = Math.floor(col.prim + 0.5);
            }
            else
                xassert(col != col);
        }
        T.sol_cnt++;
    }

    function branch_on(T, j, next){
        var mip = T.mip;
        var node;
        var m = mip.m;
        var n = mip.n;
        var type, dn_type, up_type, dn_bad, up_bad, p, ret, clone = new Array(1+2);
        var lb, ub, beta, new_ub, new_lb, dn_lp = null, up_lp = null, dn_bnd, up_bnd;
        /* determine bounds and value of x[j] in optimal solution to LP
         relaxation of the current subproblem */
        xassert(1 <= j && j <= n);
        type = mip.col[j].type;
        lb = mip.col[j].lb;
        ub = mip.col[j].ub;
        beta = mip.col[j].prim;
        /* determine new bounds of x[j] for down- and up-branches */
        new_ub = Math.floor(beta);
        new_lb = Math.ceil(beta);
        switch (type)
        {  case GLP_FR:
            dn_type = GLP_UP;
            up_type = GLP_LO;
            break;
            case GLP_LO:
                xassert(lb <= new_ub);
                dn_type = (lb == new_ub ? GLP_FX : GLP_DB);
                xassert(lb + 1.0 <= new_lb);
                up_type = GLP_LO;
                break;
            case GLP_UP:
                xassert(new_ub <= ub - 1.0);
                dn_type = GLP_UP;
                xassert(new_lb <= ub);
                up_type = (new_lb == ub ? GLP_FX : GLP_DB);
                break;
            case GLP_DB:
                xassert(lb <= new_ub && new_ub <= ub - 1.0);
                dn_type = (lb == new_ub ? GLP_FX : GLP_DB);
                xassert(lb + 1.0 <= new_lb && new_lb <= ub);
                up_type = (new_lb == ub ? GLP_FX : GLP_DB);
                break;
            default:
                xassert(type != type);
        }
        /* compute local bounds to LP relaxation for both branches */
        ios_eval_degrad(T, j, function(a, b){dn_lp = a; up_lp = b});
        /* and improve them by rounding */
        dn_bnd = ios_round_bound(T, dn_lp);
        up_bnd = ios_round_bound(T, up_lp);
        /* check local bounds for down- and up-branches */
        dn_bad = !ios_is_hopeful(T, dn_bnd);
        up_bad = !ios_is_hopeful(T, up_bnd);
        if (dn_bad && up_bad)
        {  if (T.parm.msg_lev >= GLP_MSG_DBG)
            xprintf("Both down- and up-branches are hopeless");
            ret = 2;
            return ret;
        }
        else if (up_bad)
        {  if (T.parm.msg_lev >= GLP_MSG_DBG)
            xprintf("Up-branch is hopeless");
            glp_set_col_bnds(mip, j, dn_type, lb, new_ub);
            T.curr.lp_obj = dn_lp;
            if (mip.dir == GLP_MIN)
            {  if (T.curr.bound < dn_bnd)
                T.curr.bound = dn_bnd;
            }
            else if (mip.dir == GLP_MAX)
            {  if (T.curr.bound > dn_bnd)
                T.curr.bound = dn_bnd;
            }
            else
                xassert(mip != mip);
            ret = 1;
            return ret;
        }
        else if (dn_bad)
        {  if (T.parm.msg_lev >= GLP_MSG_DBG)
            xprintf("Down-branch is hopeless");
            glp_set_col_bnds(mip, j, up_type, new_lb, ub);
            T.curr.lp_obj = up_lp;
            if (mip.dir == GLP_MIN)
            {  if (T.curr.bound < up_bnd)
                T.curr.bound = up_bnd;
            }
            else if (mip.dir == GLP_MAX)
            {  if (T.curr.bound > up_bnd)
                T.curr.bound = up_bnd;
            }
            else
                xassert(mip != mip);
            ret = 1;
            return ret;
        }
        /* both down- and up-branches seem to be hopeful */
        if (T.parm.msg_lev >= GLP_MSG_DBG)
            xprintf("Branching on column " + j + ", primal value is " + beta + "");
        /* determine the reference number of the current subproblem */
        xassert(T.curr != null);
        p = T.curr.p;
        T.curr.br_var = j;
        T.curr.br_val = beta;
        /* freeze the current subproblem */
        ios_freeze_node(T);
        /* create two clones of the current subproblem; the first clone
         begins the down-branch, the second one begins the up-branch */
        ios_clone_node(T, p, 2, clone);
        if (T.parm.msg_lev >= GLP_MSG_DBG)
            xprintf("Node " + clone[1] + " begins down branch, node " + clone[2] + " begins up branch ");
        /* set new upper bound of j-th column in the down-branch */
        node = T.slot[clone[1]].node;
        xassert(node != null);
        xassert(node.up != null);
        xassert(node.b_ptr == null);
        node.b_ptr = {};
        node.b_ptr.k = m + j;
        node.b_ptr.type = dn_type;
        node.b_ptr.lb = lb;
        node.b_ptr.ub = new_ub;
        node.b_ptr.next = null;
        node.lp_obj = dn_lp;
        if (mip.dir == GLP_MIN)
        {  if (node.bound < dn_bnd)
            node.bound = dn_bnd;
        }
        else if (mip.dir == GLP_MAX)
        {  if (node.bound > dn_bnd)
            node.bound = dn_bnd;
        }
        else
            xassert(mip != mip);
        /* set new lower bound of j-th column in the up-branch */
        node = T.slot[clone[2]].node;
        xassert(node != null);
        xassert(node.up != null);
        xassert(node.b_ptr == null);
        node.b_ptr = {};
        node.b_ptr.k = m + j;
        node.b_ptr.type = up_type;
        node.b_ptr.lb = new_lb;
        node.b_ptr.ub = ub;
        node.b_ptr.next = null;
        node.lp_obj = up_lp;
        if (mip.dir == GLP_MIN)
        {  if (node.bound < up_bnd)
            node.bound = up_bnd;
        }
        else if (mip.dir == GLP_MAX)
        {  if (node.bound > up_bnd)
            node.bound = up_bnd;
        }
        else
            xassert(mip != mip);
        /* suggest the subproblem to be solved next */
        xassert(T.child == 0);
        if (next == GLP_NO_BRNCH)
            T.child = 0;
        else if (next == GLP_DN_BRNCH)
            T.child = clone[1];
        else if (next == GLP_UP_BRNCH)
            T.child = clone[2];
        else
            xassert(next != next);
        ret = 0;
        return ret;
    }

    function fix_by_red_cost(T){
        var mip = T.mip;
        var j, stat, fixed = 0;
        var obj, lb, ub, dj;
        /* the global bound must exist */
        xassert(T.mip.mip_stat == GLP_FEAS);
        /* basic solution of LP relaxation must be optimal */
        xassert(mip.pbs_stat == GLP_FEAS && mip.dbs_stat == GLP_FEAS);
        /* determine the objective function value */
        obj = mip.obj_val;
        /* walk through the column list */
        for (j = 1; j <= mip.n; j++)
        {  var col = mip.col[j];
            /* if the column is not integer, skip it */
            if (col.kind != GLP_IV) continue;
            /* obtain bounds of j-th column */
            lb = col.lb; ub = col.ub;
            /* and determine its status and reduced cost */
            stat = col.stat; dj = col.dual;
            /* analyze the reduced cost */
            switch (mip.dir)
            {  case GLP_MIN:
                /* minimization */
                if (stat == GLP_NL)
                {  /* j-th column is non-basic on its lower bound */
                    if (dj < 0.0) dj = 0.0;
                    if (obj + dj >= mip.mip_obj){
                        glp_set_col_bnds(mip, j, GLP_FX, lb, lb); fixed++;
                    }
                }
                else if (stat == GLP_NU)
                {  /* j-th column is non-basic on its upper bound */
                    if (dj > 0.0) dj = 0.0;
                    if (obj - dj >= mip.mip_obj){
                        glp_set_col_bnds(mip, j, GLP_FX, ub, ub); fixed++;
                    }
                }
                break;
                case GLP_MAX:
                    /* maximization */
                    if (stat == GLP_NL)
                    {  /* j-th column is non-basic on its lower bound */
                        if (dj > 0.0) dj = 0.0;
                        if (obj + dj <= mip.mip_obj){
                            glp_set_col_bnds(mip, j, GLP_FX, lb, lb); fixed++;
                        }
                    }
                    else if (stat == GLP_NU)
                    {  /* j-th column is non-basic on its upper bound */
                        if (dj < 0.0) dj = 0.0;
                        if (obj - dj <= mip.mip_obj){
                            glp_set_col_bnds(mip, j, GLP_FX, ub, ub); fixed++;
                        }
                    }
                    break;
                default:
                    xassert(T != T);
            }
        }
        if (T.parm.msg_lev >= GLP_MSG_DBG)
        {  if (fixed == 0)
        {/* nothing to say */}
        else if (fixed == 1)
            xprintf("One column has been fixed by reduced cost");
        else
            xprintf(fixed + " columns have been fixed by reduced costs");
        }
        /* fixing non-basic columns on their current bounds does not
         change the basic solution */
        xassert(mip.pbs_stat == GLP_FEAS && mip.dbs_stat == GLP_FEAS);
    }


    function remove_cuts(T){
        /* remove inactive cuts (some valueable globally valid cut might
         be saved in the global cut pool) */
        var i, cnt = 0, num = null;
        xassert(T.curr != null);
        for (i = T.orig_m+1; i <= T.mip.m; i++)
        {  if (T.mip.row[i].origin == GLP_RF_CUT &&
            T.mip.row[i].level == T.curr.level &&
            T.mip.row[i].stat == GLP_BS)
        {  if (num == null)
            num = new Array(1+T.mip.m);
            num[++cnt] = i;
        }
        }
        if (cnt > 0)
        {  glp_del_rows(T.mip, cnt, num);
            xassert(glp_factorize(T.mip) == 0);
        }
    }

    function display_cut_info(T){
        var mip = T.mip;
        var i, gmi = 0, mir = 0, cov = 0, clq = 0, app = 0;
        for (i = mip.m; i > 0; i--)
        {
            var row = mip.row[i];
            /* if (row.level < T.curr.level) break; */
            if (row.origin == GLP_RF_CUT)
            {  if (row.klass == GLP_RF_GMI)
                gmi++;
            else if (row.klass == GLP_RF_MIR)
                mir++;
            else if (row.klass == GLP_RF_COV)
                cov++;
            else if (row.klass == GLP_RF_CLQ)
                clq++;
            else
                app++;
            }
        }
        xassert(T.curr != null);
        if (gmi + mir + cov + clq + app > 0)
        {  xprintf("Cuts on level " + T.curr.level + ":");
            if (gmi > 0) xprintf(" gmi = " + gmi + ";");
            if (mir > 0) xprintf(" mir = " + mir + ";");
            if (cov > 0) xprintf(" cov = " + cov + ";");
            if (clq > 0) xprintf(" clq = " + clq + ";");
            if (app > 0) xprintf(" app = " + app + ";");
            xprintf("");
        }
    }

    function generate_cuts(T){
        /* generate generic cuts with built-in generators */
        if (!(T.parm.mir_cuts == GLP_ON ||
            T.parm.gmi_cuts == GLP_ON ||
            T.parm.cov_cuts == GLP_ON ||
            T.parm.clq_cuts == GLP_ON)) return;
        {   var i, max_cuts, added_cuts;
            max_cuts = T.n;
            if (max_cuts < 1000) max_cuts = 1000;
            added_cuts = 0;
            for (i = T.orig_m+1; i <= T.mip.m; i++)
            {  if (T.mip.row[i].origin == GLP_RF_CUT)
                added_cuts++;
            }
            /* xprintf("added_cuts = %d", added_cuts); */
            if (added_cuts >= max_cuts) return;
        }
        /* generate and add to POOL all cuts violated by x* */
        if (T.parm.gmi_cuts == GLP_ON)
        {  if (T.curr.changed < 5)
            ios_gmi_gen(T);
        }
        if (T.parm.mir_cuts == GLP_ON)
        {  xassert(T.mir_gen != null);
            ios_mir_gen(T, T.mir_gen);
        }
        if (T.parm.cov_cuts == GLP_ON)
        {  /* cover cuts works well along with mir cuts */
            /*if (T.round <= 5)*/
            ios_cov_gen(T);
        }
        if (T.parm.clq_cuts == GLP_ON)
        {  if (T.clq_gen != null)
        {  if (T.curr.level == 0 && T.curr.changed < 50 ||
            T.curr.level >  0 && T.curr.changed < 5)
            ios_clq_gen(T, T.clq_gen);
        }
        }
    }

    function cleanup_the_tree(T){
        var node, next_node;
        var count = 0;
        /* the global bound must exist */
        xassert(T.mip.mip_stat == GLP_FEAS);
        /* walk through the list of active subproblems */
        for (node = T.head; node != null; node = next_node)
        {  /* deleting some active problem node may involve deleting its
         parents recursively; however, all its parents being created
         *before* it are always *precede* it in the node list, so
         the next problem node is never affected by such deletion */
            next_node = node.next;
            /* if the branch is hopeless, prune it */
            if (!is_branch_hopeful(T, node.p)){
                ios_delete_node(T, node.p); count++;
            }
        }
        if (T.parm.msg_lev >= GLP_MSG_DBG)
        {  if (count == 1)
            xprintf("One hopeless branch has been pruned");
        else if (count > 1)
            xprintf(count + " hopeless branches have been pruned");
        }
    }

    var p, curr_p, p_stat, d_stat, ret;
    var pred_p = 0;
    /* if the current subproblem has been just created due to
     branching, pred_p is the reference number of its parent
     subproblem, otherwise pred_p is zero */
    var ttt = T.tm_beg;
    /* on entry to the B&B driver it is assumed that the active list
     contains the only active (i.e. root) subproblem, which is the
     original MIP problem to be solved */

    const
        loop = 0,
        more = 1,
        fath = 2,
        done = 3;

    var label = loop;

    while (true){
        var goto = null;
        switch (label){
            case loop:
                /* main loop starts here */
                /* at this point the current subproblem does not exist */
                xassert(T.curr == null);
                /* if the active list is empty, the search is finished */
                if (T.head == null)
                {  if (T.parm.msg_lev >= GLP_MSG_DBG)
                    xprintf("Active list is empty!");
                    //xassert(dmp_in_use(T.pool).lo == 0);
                    ret = 0;
                    goto = done; break;
                }
                /* select some active subproblem to continue the search */
                xassert(T.next_p == 0);
                /* let the application program select subproblem */
                if (T.parm.cb_func != null)
                {  xassert(T.reason == 0);
                    T.reason = GLP_ISELECT;
                    T.parm.cb_func(T, T.parm.cb_info);
                    T.reason = 0;
                    if (T.stop)
                    {  ret = GLP_ESTOP;
                        goto = done; break;
                    }
                }
                if (T.next_p != 0)
                {  /* the application program has selected something */

                }
                else if (T.a_cnt == 1)
                {  /* the only active subproblem exists, so select it */
                    xassert(T.head.next == null);
                    T.next_p = T.head.p;
                }
                else if (T.child != 0)
                {  /* select one of branching childs suggested by the branching
                 heuristic */
                    T.next_p = T.child;
                }
                else
                {  /* select active subproblem as specified by the backtracking
                 technique option */
                    T.next_p = ios_choose_node(T);
                }
                /* the active subproblem just selected becomes current */
                ios_revive_node(T, T.next_p);
                T.next_p = T.child = 0;
                /* invalidate pred_p, if it is not the reference number of the
                 parent of the current subproblem */
                if (T.curr.up != null && T.curr.up.p != pred_p) pred_p = 0;
                /* determine the reference number of the current subproblem */
                p = T.curr.p;
                if (T.parm.msg_lev >= GLP_MSG_DBG)
                {  xprintf("-----------------------------------------------------" +
                    "-------------------");
                    xprintf("Processing node " + p + " at level " + T.curr.level + "");
                }
                /* if it is the root subproblem, initialize cut generators */
                if (p == 1)
                {  if (T.parm.gmi_cuts == GLP_ON)
                {  if (T.parm.msg_lev >= GLP_MSG_ALL)
                    xprintf("Gomory's cuts enabled");
                }
                    if (T.parm.mir_cuts == GLP_ON)
                    {  if (T.parm.msg_lev >= GLP_MSG_ALL)
                        xprintf("MIR cuts enabled");
                        xassert(T.mir_gen == null);
                        T.mir_gen = ios_mir_init(T);
                    }
                    if (T.parm.cov_cuts == GLP_ON)
                    {  if (T.parm.msg_lev >= GLP_MSG_ALL)
                        xprintf("Cover cuts enabled");
                    }
                    if (T.parm.clq_cuts == GLP_ON)
                    {  xassert(T.clq_gen == null);
                        if (T.parm.msg_lev >= GLP_MSG_ALL)
                            xprintf("Clique cuts enabled");
                        T.clq_gen = ios_clq_init(T);
                    }
                }
            case more:
                /* minor loop starts here */
                /* at this point the current subproblem needs either to be solved
                 for the first time or re-optimized due to reformulation */
                /* display current progress of the search */
                if (T.parm.msg_lev >= GLP_MSG_DBG ||
                    T.parm.msg_lev >= GLP_MSG_ON &&
                        (T.parm.out_frq - 1) <=
                            1000.0 * xdifftime(xtime(), T.tm_lag))
                    show_progress(T, 0);
                if (T.parm.msg_lev >= GLP_MSG_ALL &&
                    xdifftime(xtime(), ttt) >= 60.0)
                {
                    xprintf("Time used: " + xdifftime(xtime(), T.tm_beg) + " secs");
                    ttt = xtime();
                }
                /* check the mip gap */
                if (T.parm.mip_gap > 0.0 &&
                    ios_relative_gap(T) <= T.parm.mip_gap)
                {  if (T.parm.msg_lev >= GLP_MSG_DBG)
                    xprintf("Relative gap tolerance reached; search terminated ");
                    ret = GLP_EMIPGAP;
                    goto = done; break;
                }
                /* check if the time limit has been exhausted */
                if (T.parm.tm_lim < INT_MAX &&
                    (T.parm.tm_lim - 1) <=
                        1000.0 * xdifftime(xtime(), T.tm_beg))
                {  if (T.parm.msg_lev >= GLP_MSG_DBG)
                    xprintf("Time limit exhausted; search terminated");
                    ret = GLP_ETMLIM;
                    goto = done; break;
                }
                /* let the application program preprocess the subproblem */
                if (T.parm.cb_func != null)
                {  xassert(T.reason == 0);
                    T.reason = GLP_IPREPRO;
                    T.parm.cb_func(T, T.parm.cb_info);
                    T.reason = 0;
                    if (T.stop)
                    {  ret = GLP_ESTOP;
                        goto = done; break;
                    }
                }
                /* perform basic preprocessing */
                if (T.parm.pp_tech == GLP_PP_NONE){

                }
                else if (T.parm.pp_tech == GLP_PP_ROOT)
                {  if (T.curr.level == 0)
                {  if (ios_preprocess_node(T, 100)){
                    goto  = fath; break;
                }
                }
                }
                else if (T.parm.pp_tech == GLP_PP_ALL)
                {  if (ios_preprocess_node(T, T.curr.level == 0 ? 100 : 10)){
                    goto = fath; break;
                }
                }
                else
                    xassert(T != T);
                /* preprocessing may improve the global bound */
                if (!is_branch_hopeful(T, p))
                {  xprintf("*** not tested yet ***");
                    goto = fath; break;
                }
                /* solve LP relaxation of the current subproblem */
                if (T.parm.msg_lev >= GLP_MSG_DBG)
                    xprintf("Solving LP relaxation...");
                ret = ios_solve_node(T);
                if (!(ret == 0 || ret == GLP_EOBJLL || ret == GLP_EOBJUL))
                {  if (T.parm.msg_lev >= GLP_MSG_ERR)
                    xprintf("ios_driver: unable to solve current LP relaxation; glp_simplex returned " + ret + "");
                    ret = GLP_EFAIL;
                    goto = done; break;
                }
                /* analyze status of the basic solution to LP relaxation found */
                p_stat = T.mip.pbs_stat;
                d_stat = T.mip.dbs_stat;
                if (p_stat == GLP_FEAS && d_stat == GLP_FEAS)
                {  /* LP relaxation has optimal solution */
                    if (T.parm.msg_lev >= GLP_MSG_DBG)
                        xprintf("Found optimal solution to LP relaxation");
                }
                else if (d_stat == GLP_NOFEAS)
                {  /* LP relaxation has no dual feasible solution */
                    /* since the current subproblem cannot have a larger feasible
                     region than its parent, there is something wrong */
                    if (T.parm.msg_lev >= GLP_MSG_ERR)
                        xprintf("ios_driver: current LP relaxation has no dual feasible solution");
                    ret = GLP_EFAIL;
                    goto = done; break;
                }
                else if (p_stat == GLP_INFEAS && d_stat == GLP_FEAS)
                {  /* LP relaxation has no primal solution which is better than
                 the incumbent objective value */
                    xassert(T.mip.mip_stat == GLP_FEAS);
                    if (T.parm.msg_lev >= GLP_MSG_DBG)
                        xprintf("LP relaxation has no solution better than incumbent objective value");
                    /* prune the branch */
                    goto = fath; break;
                }
                else if (p_stat == GLP_NOFEAS)
                {  /* LP relaxation has no primal feasible solution */
                    if (T.parm.msg_lev >= GLP_MSG_DBG)
                        xprintf("LP relaxation has no feasible solution");
                    /* prune the branch */
                    goto = fath; break;
                }
                else
                {  /* other cases cannot appear */
                    xassert(T.mip != T.mip);
                }
                /* at this point basic solution to LP relaxation of the current
                 subproblem is optimal */
                xassert(p_stat == GLP_FEAS && d_stat == GLP_FEAS);
                xassert(T.curr != null);
                T.curr.lp_obj = T.mip.obj_val;
                /* thus, it defines a local bound to integer optimal solution of
                 the current subproblem */
                {  var bound = T.mip.obj_val;
                    /* some local bound to the current subproblem could be already
                    set before, so we should only improve it */
                    bound = ios_round_bound(T, bound);
                    if (T.mip.dir == GLP_MIN)
                    {  if (T.curr.bound < bound)
                        T.curr.bound = bound;
                    }
                    else if (T.mip.dir == GLP_MAX)
                    {  if (T.curr.bound > bound)
                        T.curr.bound = bound;
                    }
                    else
                        xassert(T.mip != T.mip);
                    if (T.parm.msg_lev >= GLP_MSG_DBG)
                        xprintf("Local bound is " + bound + "");
                }
                /* if the local bound indicates that integer optimal solution of
                 the current subproblem cannot be better than the global bound,
                 prune the branch */
                if (!is_branch_hopeful(T, p))
                {  if (T.parm.msg_lev >= GLP_MSG_DBG)
                    xprintf("Current branch is hopeless and can be pruned");
                    goto = fath; break;
                }
                /* let the application program generate additional rows ("lazy"
                 constraints) */
                xassert(T.reopt == 0);
                xassert(T.reinv == 0);
                if (T.parm.cb_func != null)
                {  xassert(T.reason == 0);
                    T.reason = GLP_IROWGEN;
                    T.parm.cb_func(T, T.parm.cb_info);
                    T.reason = 0;
                    if (T.stop)
                    {  ret = GLP_ESTOP;
                        goto = done; break;
                    }
                    if (T.reopt)
                    {  /* some rows were added; re-optimization is needed */
                        T.reopt = T.reinv = 0;
                        goto = more; break;
                    }
                    if (T.reinv)
                    {  /* no rows were added, however, some inactive rows were
                     removed */
                        T.reinv = 0;
                        xassert(glp_factorize(T.mip) == 0);
                    }
                }
                /* check if the basic solution is integer feasible */
                check_integrality(T);
                /* if the basic solution satisfies to all integrality conditions,
                 it is a new, better integer feasible solution */
                if (T.curr.ii_cnt == 0)
                {  if (T.parm.msg_lev >= GLP_MSG_DBG)
                    xprintf("New integer feasible solution found");
                    if (T.parm.msg_lev >= GLP_MSG_ALL)
                        display_cut_info(T);
                    record_solution(T);
                    if (T.parm.msg_lev >= GLP_MSG_ON)
                        show_progress(T, 1);
                    /* make the application program happy */
                    if (T.parm.cb_func != null)
                    {  xassert(T.reason == 0);
                        T.reason = GLP_IBINGO;
                        T.parm.cb_func(T, T.parm.cb_info);
                        T.reason = 0;
                        if (T.stop)
                        {  ret = GLP_ESTOP;
                            goto = done; break;
                        }
                    }
                    /* since the current subproblem has been fathomed, prune its
                     branch */
                    goto = fath; break;
                }
                /* at this point basic solution to LP relaxation of the current
                 subproblem is optimal, but integer infeasible */
                /* try to fix some non-basic structural variables of integer kind
                 on their current bounds due to reduced costs */
                if (T.mip.mip_stat == GLP_FEAS)
                    fix_by_red_cost(T);
                /* let the application program try to find some solution to the
                 original MIP with a primal heuristic */
                if (T.parm.cb_func != null)
                {  xassert(T.reason == 0);
                    T.reason = GLP_IHEUR;
                    T.parm.cb_func(T, T.parm.cb_info);
                    T.reason = 0;
                    if (T.stop)
                    {  ret = GLP_ESTOP;
                        goto = done; break;
                    }
                    /* check if the current branch became hopeless */
                    if (!is_branch_hopeful(T, p))
                    {  if (T.parm.msg_lev >= GLP_MSG_DBG)
                        xprintf("Current branch became hopeless and can be pruned");
                        goto = fath; break;
                    }
                }
                /* try to find solution with the feasibility pump heuristic */
                if (T.parm.fp_heur)
                {  xassert(T.reason == 0);
                    T.reason = GLP_IHEUR;
                    ios_feas_pump(T);
                    T.reason = 0;
                    /* check if the current branch became hopeless */
                    if (!is_branch_hopeful(T, p))
                    {  if (T.parm.msg_lev >= GLP_MSG_DBG)
                        xprintf("Current branch became hopeless and can be pruned");
                        goto = fath; break;
                    }
                }
                /* it's time to generate cutting planes */
                xassert(T.local != null);
                xassert(T.local.size == 0);
                /* let the application program generate some cuts; note that it
                 can add cuts either to the local cut pool or directly to the
                 current subproblem */
                if (T.parm.cb_func != null)
                {  xassert(T.reason == 0);
                    T.reason = GLP_ICUTGEN;
                    T.parm.cb_func(T, T.parm.cb_info);
                    T.reason = 0;
                    if (T.stop)
                    {  ret = GLP_ESTOP;
                        goto = done; break;
                    }
                }
                /* try to generate generic cuts with built-in generators
                 (as suggested by Matteo Fischetti et al. the built-in cuts
                 are not generated at each branching node; an intense attempt
                 of generating new cuts is only made at the root node, and then
                 a moderate effort is spent after each backtracking step) */
                if (T.curr.level == 0 || pred_p == 0)
                {  xassert(T.reason == 0);
                    T.reason = GLP_ICUTGEN;
                    generate_cuts(T);
                    T.reason = 0;
                }
                /* if the local cut pool is not empty, select useful cuts and add
                 them to the current subproblem */
                if (T.local.size > 0)
                {  xassert(T.reason == 0);
                    T.reason = GLP_ICUTGEN;
                    ios_process_cuts(T);
                    T.reason = 0;
                }
                /* clear the local cut pool */
                ios_clear_pool(T.local);
                /* perform re-optimization, if necessary */
                if (T.reopt)
                {  T.reopt = 0;
                    T.curr.changed++;
                    goto = more; break;
                }
                /* no cuts were generated; remove inactive cuts */
                remove_cuts(T);
                if (T.parm.msg_lev >= GLP_MSG_ALL && T.curr.level == 0)
                    display_cut_info(T);
                /* update history information used on pseudocost branching */
                if (T.pcost != null) ios_pcost_update(T);
                /* it's time to perform branching */
                xassert(T.br_var == 0);
                xassert(T.br_sel == 0);
                /* let the application program choose variable to branch on */
                if (T.parm.cb_func != null)
                {  xassert(T.reason == 0);
                    xassert(T.br_var == 0);
                    xassert(T.br_sel == 0);
                    T.reason = GLP_IBRANCH;
                    T.parm.cb_func(T, T.parm.cb_info);
                    T.reason = 0;
                    if (T.stop)
                    {  ret = GLP_ESTOP;
                        goto = done; break;
                    }
                }
                /* if nothing has been chosen, choose some variable as specified
                 by the branching technique option */
                if (T.br_var == 0)
                    T.br_var = ios_choose_var(T, function(next){T.br_sel = next});
                /* perform actual branching */
                curr_p = T.curr.p;
                ret = branch_on(T, T.br_var, T.br_sel);
                T.br_var = T.br_sel = 0;
                if (ret == 0)
                {  /* both branches have been created */
                    pred_p = curr_p;
                    goto = loop; break;
                }
                else if (ret == 1)
                {  /* one branch is hopeless and has been pruned, so now the
                 current subproblem is other branch */
                    /* the current subproblem should be considered as a new one,
                     since one bound of the branching variable was changed */
                    T.curr.solved = T.curr.changed = 0;
                    goto = more; break;
                }
                else if (ret == 2)
                {  /* both branches are hopeless and have been pruned; new
                 subproblem selection is needed to continue the search */
                    goto = fath; break;
                }
                else
                    xassert(ret != ret);
            case fath:
                /* the current subproblem has been fathomed */
                if (T.parm.msg_lev >= GLP_MSG_DBG)
                    xprintf("Node " + p + " fathomed");
                /* freeze the current subproblem */
                ios_freeze_node(T);
                /* and prune the corresponding branch of the tree */
                ios_delete_node(T, p);
                /* if a new integer feasible solution has just been found, other
                 branches may become hopeless and therefore must be pruned */
                if (T.mip.mip_stat == GLP_FEAS) cleanup_the_tree(T);
                /* new subproblem selection is needed due to backtracking */
                pred_p = 0;
                goto = loop; break;
            case done:
                /* display progress of the search on exit from the solver */
                if (T.parm.msg_lev >= GLP_MSG_ON)
                    show_progress(T, 0);
                T.mir_gen = null;
                T.clq_gen = null;
                /* return to the calling program */
                return ret;
        }
        if (goto == null) break;
        label = goto;
    }
}

function ios_create_vec(n){
    var v;
    xassert(n >= 0);
    v = {};
    v.n = n;
    v.nnz = 0;
    v.pos = new Array(1+n);
    xfillArr(v.pos, 1, 0, n);
    v.ind = new Array(1+n);
    v.val = new Array(1+n);
    return v;
}

function ios_check_vec(v){
    var j, k, nnz;
    xassert(v.n >= 0);
    nnz = 0;
    for (j = v.n; j >= 1; j--)
    {  k = v.pos[j];
        xassert(0 <= k && k <= v.nnz);
        if (k != 0)
        {  xassert(v.ind[k] == j);
            nnz++;
        }
    }
    xassert(v.nnz == nnz);
}

function ios_get_vj(v, j){
    var k;
    xassert(1 <= j && j <= v.n);
    k = v.pos[j];
    xassert(0 <= k && k <= v.nnz);
    return (k == 0 ? 0.0 : v.val[k]);
}

function ios_set_vj(v, j, val){
    xassert(1 <= j && j <= v.n);
    var k = v.pos[j];
    if (val == 0.0)
    {  if (k != 0)
    {  /* remove j-th component */
        v.pos[j] = 0;
        if (k < v.nnz)
        {  v.pos[v.ind[v.nnz]] = k;
            v.ind[k] = v.ind[v.nnz];
            v.val[k] = v.val[v.nnz];
        }
        v.nnz--;
    }
    }
    else
    {  if (k == 0)
    {  /* create j-th component */
        k = ++(v.nnz);
        v.pos[j] = k;
        v.ind[k] = j;
    }
        v.val[k] = val;
    }
}

function ios_clear_vec(v){
    for (var k = 1; k <= v.nnz; k++)
        v.pos[v.ind[k]] = 0;
    v.nnz = 0;
}

function ios_clean_vec(v, eps){
    var nnz = 0;
    for (var k = 1; k <= v.nnz; k++)
    {  if (Math.abs(v.val[k]) == 0.0 || Math.abs(v.val[k]) < eps)
    {  /* remove component */
        v.pos[v.ind[k]] = 0;
    }
    else
    {  /* keep component */
        nnz++;
        v.pos[v.ind[k]] = nnz;
        v.ind[nnz] = v.ind[k];
        v.val[nnz] = v.val[k];
    }
    }
    v.nnz = nnz;
}

function ios_copy_vec(x, y){
    xassert(x != y);
    xassert(x.n == y.n);
    ios_clear_vec(x);
    x.nnz = y.nnz;
    xcopyArr(x.ind, 1, y.ind, 1, x.nnz);
    xcopyArr(x.val, 1, y.val, 1, x.nnz);
    for (var j = 1; j <= x.nnz; j++)
        x.pos[x.ind[j]] = j;
}

function ios_linear_comb(x, a, y){
    var j, xj, yj;
    xassert(x != y);
    xassert(x.n == y.n);
    for (var k = 1; k <= y.nnz; k++)
    {   j = y.ind[k];
        xj = ios_get_vj(x, j);
        yj = y.val[k];
        ios_set_vj(x, j, xj + a * yj);
    }
}

function ios_gmi_gen(tree){

    const MAXCUTS = 50;
    /* maximal number of cuts to be generated for one round */

    function f(x) {return x - Math.floor(x)}
    /* compute fractional part of x */

    function gen_cut(tree, worka, j){
        /* this routine tries to generate Gomory's mixed integer cut for
         specified structural variable x[m+j] of integer kind, which is
         basic and has fractional value in optimal solution to current
         LP relaxation */
        var mip = tree.mip;
        var m = mip.m;
        var n = mip.n;
        var ind = worka.ind;
        var val = worka.val;
        var phi = worka.phi;
        var i, k, len, kind, stat;
        var lb, ub, alfa, beta, ksi, phi1, rhs;
        var row, col;
        /* compute row of the simplex tableau, which (row) corresponds
         to specified basic variable xB[i] = x[m+j]; see (23) */
        len = glp_eval_tab_row(mip, m+j, ind, val);
        /* determine beta[i], which a value of xB[i] in optimal solution
         to current LP relaxation; note that this value is the same as
         if it would be computed with formula (27); it is assumed that
         beta[i] is fractional enough */
        beta = mip.col[j].prim;
        /* compute cut coefficients phi and right-hand side rho, which
         correspond to formula (30); dense format is used, because rows
         of the simplex tableau is usually dense */
        for (k = 1; k <= m+n; k++) phi[k] = 0.0;
        rhs = f(beta); /* initial value of rho; see (28), (32) */
        for (j = 1; j <= len; j++)
        {  /* determine original number of non-basic variable xN[j] */
            k = ind[j];
            xassert(1 <= k && k <= m+n);
            /* determine the kind, bounds and current status of xN[j] in
             optimal solution to LP relaxation */
            if (k <= m)
            {  /* auxiliary variable */
                row = mip.row[k];
                kind = GLP_CV;
                lb = row.lb;
                ub = row.ub;
                stat = row.stat;
            }
            else
            {  /* structural variable */
                col = mip.col[k-m];
                kind = col.kind;
                lb = col.lb;
                ub = col.ub;
                stat = col.stat;
            }
            /* xN[j] cannot be basic */
            xassert(stat != GLP_BS);
            /* determine row coefficient ksi[i,j] at xN[j]; see (23) */
            ksi = val[j];
            /* if ksi[i,j] is too large in the magnitude, do not generate
             the cut */
            if (Math.abs(ksi) > 1e+05) return;
            /* if ksi[i,j] is too small in the magnitude, skip it */
            if (Math.abs(ksi) < 1e-10) continue;
            /* compute row coefficient alfa[i,j] at y[j]; see (26) */
            switch (stat)
            {  case GLP_NF:
                /* xN[j] is free (unbounded) having non-zero ksi[i,j];
                 do not generate the cut */
                return;
                case GLP_NL:
                    /* xN[j] has active lower bound */
                    alfa = - ksi;
                    break;
                case GLP_NU:
                    /* xN[j] has active upper bound */
                    alfa = + ksi;
                    break;
                case GLP_NS:
                    /* xN[j] is fixed; skip it */
                    continue;
                default:
                    xassert(stat != stat);
            }
            /* compute cut coefficient phi'[j] at y[j]; see (21), (28) */
            switch (kind)
            {  case GLP_IV:
                /* y[j] is integer */
                if (Math.abs(alfa - Math.floor(alfa + 0.5)) < 1e-10)
                {  /* alfa[i,j] is close to nearest integer; skip it */
                    continue;
                }
                else if (f(alfa) <= f(beta))
                    phi1 = f(alfa);
                else
                    phi1 = (f(beta) / (1.0 - f(beta))) * (1.0 - f(alfa));
                break;
                case GLP_CV:
                    /* y[j] is continuous */
                    if (alfa >= 0.0)
                        phi1 = + alfa;
                    else
                        phi1 = (f(beta) / (1.0 - f(beta))) * (- alfa);
                    break;
                default:
                    xassert(kind != kind);
            }
            /* compute cut coefficient phi[j] at xN[j] and update right-
             hand side rho; see (31), (32) */
            switch (stat)
            {  case GLP_NL:
                /* xN[j] has active lower bound */
                phi[k] = + phi1;
                rhs += phi1 * lb;
                break;
                case GLP_NU:
                    /* xN[j] has active upper bound */
                    phi[k] = - phi1;
                    rhs -= phi1 * ub;
                    break;
                default:
                    xassert(stat != stat);
            }
        }
        /* now the cut has the form sum_k phi[k] * x[k] >= rho, where cut
         coefficients are stored in the array phi in dense format;
         x[1,...,m] are auxiliary variables, x[m+1,...,m+n] are struc-
         tural variables; see (30) */
        /* eliminate auxiliary variables in order to express the cut only
         through structural variables; see (33) */
        for (i = 1; i <= m; i++)
        {
            var aij;
            if (Math.abs(phi[i]) < 1e-10) continue;
            /* auxiliary variable x[i] has non-zero cut coefficient */
            row = mip.row[i];
            /* x[i] cannot be fixed */
            xassert(row.type != GLP_FX);
            /* substitute x[i] = sum_j a[i,j] * x[m+j] */
            for (aij = row.ptr; aij != null; aij = aij.r_next)
                phi[m+aij.col.j] += phi[i] * aij.val;
        }
        /* convert the final cut to sparse format and substitute fixed
         (structural) variables */
        len = 0;
        for (j = 1; j <= n; j++)
        {
            if (Math.abs(phi[m+j]) < 1e-10) continue;
            /* structural variable x[m+j] has non-zero cut coefficient */
            col = mip.col[j];
            if (col.type == GLP_FX)
            {  /* eliminate x[m+j] */
                rhs -= phi[m+j] * col.lb;
            }
            else
            {  len++;
                ind[len] = j;
                val[len] = phi[m+j];
            }
        }
        if (Math.abs(rhs) < 1e-12) rhs = 0.0;
        /* if the cut inequality seems to be badly scaled, reject it to
         avoid numeric difficulties */
        for (k = 1; k <= len; k++)
        {  if (Math.abs(val[k]) < 1e-03) return;
            if (Math.abs(val[k]) > 1e+03) return;
        }
        /* add the cut to the cut pool for further consideration */
        glp_ios_add_row(tree, null, GLP_RF_GMI, 0, len, ind, val, GLP_LO, rhs);
    }

    /* main routine to generate Gomory's cuts */
    var mip = tree.mip;
    var m = mip.m;
    var n = mip.n;
    var var_;
    var k, nv, j, size;
    var worka = {};
    /* allocate working arrays */
    var_ = new Array(1+n);
    worka.ind = new Array(1+n);
    worka.val = new Array(1+n);
    worka.phi = new Array(1+m+n);
    /* build the list of integer structural variables, which are
     basic and have fractional value in optimal solution to current
     LP relaxation */
    nv = 0;
    for (j = 1; j <= n; j++)
    {  var col = mip.col[j];
        var frac;
        if (col.kind != GLP_IV) continue;
        if (col.type == GLP_FX) continue;
        if (col.stat != GLP_BS) continue;
        frac = f(col.prim);
        if (!(0.05 <= frac && frac <= 0.95)) continue;
        /* add variable to the list */
        nv++; var_[nv].j = j; var_[nv].f = frac;
    }
    /* order the list by descending fractionality */
    xqsort(var_, 1, nv,
        function(v1, v2){
            if (v1.f > v2.f) return -1;
            if (v1.f < v2.f) return +1;
            return 0;
        }
    );
    /* try to generate cuts by one for each variable in the list, but
     not more than MAXCUTS cuts */
    size = glp_ios_pool_size(tree);
    for (k = 1; k <= nv; k++)
    {  if (glp_ios_pool_size(tree) - size >= MAXCUTS) break;
        gen_cut(tree, worka, var_[k].j);
    }
}


const _MIR_DEBUG = 0;

const MAXAGGR = 5;
/* maximal number of rows which can be aggregated */

function ios_mir_init(tree){
    function set_row_attrib(tree, mir){
        /* set global row attributes */
        var mip = tree.mip;
        var m = mir.m;
        var k;
        for (k = 1; k <= m; k++)
        {  var row = mip.row[k];
            mir.skip[k] = 0;
            mir.isint[k] = 0;
            switch (row.type)
            {  case GLP_FR:
                mir.lb[k] = -DBL_MAX; mir.ub[k] = +DBL_MAX; break;
                case GLP_LO:
                    mir.lb[k] = row.lb; mir.ub[k] = +DBL_MAX; break;
                case GLP_UP:
                    mir.lb[k] = -DBL_MAX; mir.ub[k] = row.ub; break;
                case GLP_DB:
                    mir.lb[k] = row.lb; mir.ub[k] = row.ub; break;
                case GLP_FX:
                    mir.lb[k] = mir.ub[k] = row.lb; break;
                default:
                    xassert(row != row);
            }
            mir.vlb[k] = mir.vub[k] = 0;
        }
    }

    function set_col_attrib(tree, mir){
        /* set global column attributes */
        var mip = tree.mip;
        var m = mir.m;
        var n = mir.n;
        var k;
        for (k = m+1; k <= m+n; k++)
        {  var col = mip.col[k-m];
            switch (col.kind)
            {  case GLP_CV:
                mir.isint[k] = 0; break;
                case GLP_IV:
                    mir.isint[k] = 1; break;
                default:
                    xassert(col != col);
            }
            switch (col.type)
            {  case GLP_FR:
                mir.lb[k] = -DBL_MAX; mir.ub[k] = +DBL_MAX; break;
                case GLP_LO:
                    mir.lb[k] = col.lb; mir.ub[k] = +DBL_MAX; break;
                case GLP_UP:
                    mir.lb[k] = -DBL_MAX; mir.ub[k] = col.ub; break;
                case GLP_DB:
                    mir.lb[k] = col.lb; mir.ub[k] = col.ub; break;
                case GLP_FX:
                    mir.lb[k] = mir.ub[k] = col.lb; break;
                default:
                    xassert(col != col);
            }
            mir.vlb[k] = mir.vub[k] = 0;
        }
    }

    function set_var_bounds(tree, mir){
        /* set variable bounds */
        var mip = tree.mip;
        var m = mir.m;
        var aij;
        var i, k1, k2;
        var a1, a2;
        for (i = 1; i <= m; i++)
        {  /* we need the row to be '>= 0' or '<= 0' */
            if (!(mir.lb[i] == 0.0 && mir.ub[i] == +DBL_MAX ||
                mir.lb[i] == -DBL_MAX && mir.ub[i] == 0.0)) continue;
            /* take first term */
            aij = mip.row[i].ptr;
            if (aij == null) continue;
            k1 = m + aij.col.j; a1 = aij.val;
            /* take second term */
            aij = aij.r_next;
            if (aij == null) continue;
            k2 = m + aij.col.j; a2 = aij.val;
            /* there must be only two terms */
            if (aij.r_next != null) continue;
            /* interchange terms, if needed */
            if (!mir.isint[k1] && mir.isint[k2]){

            }
            else if (mir.isint[k1] && !mir.isint[k2])
            {  k2 = k1; a2 = a1;
                k1 = m + aij.col.j; a1 = aij.val;
            }
            else
            {  /* both terms are either continuous or integer */
                continue;
            }
            /* x[k2] should be double-bounded */
            if (mir.lb[k2] == -DBL_MAX || mir.ub[k2] == +DBL_MAX ||
                mir.lb[k2] == mir.ub[k2]) continue;
            /* change signs, if necessary */
            if (mir.ub[i] == 0.0){a1 = - a1; a2 = - a2}
            /* now the row has the form a1 * x1 + a2 * x2 >= 0, where x1
             is continuous, x2 is integer */
            if (a1 > 0.0)
            {  /* x1 >= - (a2 / a1) * x2 */
                if (mir.vlb[k1] == 0)
                {  /* set variable lower bound for x1 */
                    mir.lb[k1] = - a2 / a1;
                    mir.vlb[k1] = k2;
                    /* the row should not be used */
                    mir.skip[i] = 1;
                }
            }
            else /* a1 < 0.0 */
            {  /* x1 <= - (a2 / a1) * x2 */
                if (mir.vub[k1] == 0)
                {  /* set variable upper bound for x1 */
                    mir.ub[k1] = - a2 / a1;
                    mir.vub[k1] = k2;
                    /* the row should not be used */
                    mir.skip[i] = 1;
                }
            }
        }
    }

    function mark_useless_rows(tree, mir){
        /* mark rows which should not be used */
        var mip = tree.mip;
        var m = mir.m;
        var aij;
        var i, k, nv;
        for (i = 1; i <= m; i++)
        {  /* free rows should not be used */
            if (mir.lb[i] == -DBL_MAX && mir.ub[i] == +DBL_MAX)
            {  mir.skip[i] = 1;
                continue;
            }
            nv = 0;
            for (aij = mip.row[i].ptr; aij != null; aij = aij.r_next)
            {  k = m + aij.col.j;
                /* rows with free variables should not be used */
                if (mir.lb[k] == -DBL_MAX && mir.ub[k] == +DBL_MAX)
                {  mir.skip[i] = 1;
                    break;
                }
                /* rows with integer variables having infinite (lower or
                 upper) bound should not be used */
                if (mir.isint[k] && mir.lb[k] == -DBL_MAX ||
                    mir.isint[k] && mir.ub[k] == +DBL_MAX)
                {  mir.skip[i] = 1;
                    break;
                }
                /* count non-fixed variables */
                if (!(mir.vlb[k] == 0 && mir.vub[k] == 0 &&
                    mir.lb[k] == mir.ub[k])) nv++;
            }
            /* rows with all variables fixed should not be used */
            if (nv == 0)
            {  mir.skip[i] = 1;
                //continue;
            }
        }
    }

    /* initialize MIR cut generator */
    var mip = tree.mip;
    var m = mip.m;
    var n = mip.n;
    var mir;
    if (_MIR_DEBUG){
        xprintf("ios_mir_init: warning: debug mode enabled");
    }
    /* allocate working area */
    mir = {};
    mir.m = m;
    mir.n = n;
    mir.skip = new Array(1+m);
    mir.isint = new Array(1+m+n);
    mir.lb = new Array(1+m+n);
    mir.vlb = new Array(1+m+n);
    mir.ub = new Array(1+m+n);
    mir.vub = new Array(1+m+n);
    mir.x = new Array(1+m+n);
    mir.agg_row = new Array(1+MAXAGGR);
    mir.agg_vec = ios_create_vec(m+n);
    mir.subst = new Array(1+m+n);
    mir.mod_vec = ios_create_vec(m+n);
    mir.cut_vec = ios_create_vec(m+n);
    /* set global row attributes */
    set_row_attrib(tree, mir);
    /* set global column attributes */
    set_col_attrib(tree, mir);
    /* set variable bounds */
    set_var_bounds(tree, mir);
    /* mark rows which should not be used */
    mark_useless_rows(tree, mir);
    return mir;
}

function ios_mir_gen(tree, mir){

    var beta, gamma;

    function cmir_sep(n, a, b, u, x, s, alpha){

        function cmir_cmp(v1, v2){
            if (v1.v < v2.v) return -1;
            if (v1.v > v2.v) return +1;
            return 0;
        }

        function cmir_ineq(n, a, b, u, cset, delta, alpha){

            function mir_ineq(n, a, b, alpha){
                var j;
                var f, t;
                if (Math.abs(b - Math.floor(b + .5)) < 0.01)
                    return 1;
                f = b - Math.floor(b);
                for (j = 1; j <= n; j++)
                {  t = (a[j] - Math.floor(a[j])) - f;
                    if (t <= 0.0)
                        alpha[j] = Math.floor(a[j]);
                    else
                        alpha[j] = Math.floor(a[j]) + t / (1.0 - f);
                }
                beta = Math.floor(b);
                gamma = 1.0 / (1.0 - f);
                return 0;
            }


            var j;
            var aa, bb;

            aa = alpha; bb = b;
            for (j = 1; j <= n; j++)
            {  aa[j] = a[j] / delta;
                if (cset[j])
                    aa[j] = - aa[j]; bb -= a[j] * u[j];
            }
            bb /= delta;
            if (mir_ineq(n, aa, bb, alpha)) return 1;
            for (j = 1; j <= n; j++)
            {  if (cset[j]){
                alpha[j] = - alpha[j];
                beta += alpha[j] * u[j];
            }

            }
            gamma /= delta;
            return 0;
        }

        var fail, j, k, nv, v;
        var delta, eps, d_try = new Array(1+3), r, r_best;
        var cset;
        var vset;

        /* allocate working arrays */
        cset = new Array(1+n);
        vset = new Array(1+n);
        /* choose initial C */
        for (j = 1; j <= n; j++)
            cset[j] = (x[j] >= 0.5 * u[j]);
        /* choose initial delta */
        r_best = delta = 0.0;
        for (j = 1; j <= n; j++)
        {  xassert(a[j] != 0.0);
            /* if x[j] is close to its bounds, skip it */
            eps = 1e-9 * (1.0 + Math.abs(u[j]));
            if (x[j] < eps || x[j] > u[j] - eps) continue;
            /* try delta = |a[j]| to construct c-MIR inequality */
            fail = cmir_ineq(n, a, b, u, cset, Math.abs(a[j]), alpha);
            if (fail) continue;
            /* compute violation */
            r = - beta - gamma * s;
            for (k = 1; k <= n; k++) r += alpha[k] * x[k];
            if (r_best < r){r_best = r; delta = Math.abs(a[j])}
        }
        if (r_best < 0.001) r_best = 0.0;
        if (r_best == 0.0) return r_best;
        xassert(delta > 0.0);
        /* try to increase violation by dividing delta by 2, 4, and 8,
         respectively */
        d_try[1] = delta / 2.0;
        d_try[2] = delta / 4.0;
        d_try[3] = delta / 8.0;
        for (j = 1; j <= 3; j++)
        {  /* construct c-MIR inequality */
            fail = cmir_ineq(n, a, b, u, cset, d_try[j], alpha);
            if (fail) continue;
            /* compute violation */
            r = - beta - gamma * s;
            for (k = 1; k <= n; k++) r += alpha[k] * x[k];
            if (r_best < r){r_best = r; delta = d_try[j]}
        }
        /* build subset of variables lying strictly between their bounds
         and order it by nondecreasing values of |x[j] - u[j]/2| */
        nv = 0;
        for (j = 1; j <= n; j++)
        {  /* if x[j] is close to its bounds, skip it */
            eps = 1e-9 * (1.0 + Math.abs(u[j]));
            if (x[j] < eps || x[j] > u[j] - eps) continue;
            /* add x[j] to the subset */
            nv++;
            vset[nv].j = j;
            vset[nv].v = Math.abs(x[j] - 0.5 * u[j]);
        }
        xqsort(vset, 1, nv, cmir_cmp);
        /* try to increase violation by successively complementing each
         variable in the subset */
        for (v = 1; v <= nv; v++)
        {  j = vset[v].j;
            /* replace x[j] by its complement or vice versa */
            cset[j] = !cset[j];
            /* construct c-MIR inequality */
            fail = cmir_ineq(n, a, b, u, cset, delta, alpha);
            /* restore the variable */
            cset[j] = !cset[j];
            /* do not replace the variable in case of failure */
            if (fail) continue;
            /* compute violation */
            r = - beta - gamma * s;
            for (k = 1; k <= n; k++) r += alpha[k] * x[k];
            if (r_best < r){r_best = r; cset[j] = !cset[j]}
        }
        /* construct the best c-MIR inequality chosen */
        fail = cmir_ineq(n, a, b, u, cset, delta, alpha);
        xassert(!fail);
        /* return to the calling routine */
        return r_best;
    }

    function get_current_point(tree, mir){
        /* obtain current point */
        var mip = tree.mip;
        var m = mir.m;
        var n = mir.n;
        var k;
        for (k = 1; k <= m; k++)
            mir.x[k] = mip.row[k].prim;
        for (k = m+1; k <= m+n; k++)
            mir.x[k] = mip.col[k-m].prim;
    }

    if (_MIR_DEBUG){
        function check_current_point(mir){
            /* check current point */
            var m = mir.m;
            var n = mir.n;
            var k, kk;
            var lb, ub, eps;
            for (k = 1; k <= m+n; k++)
            {  /* determine lower bound */
                lb = mir.lb[k];
                kk = mir.vlb[k];
                if (kk != 0)
                {  xassert(lb != -DBL_MAX);
                    xassert(!mir.isint[k]);
                    xassert(mir.isint[kk]);
                    lb *= mir.x[kk];
                }
                /* check lower bound */
                if (lb != -DBL_MAX)
                {  eps = 1e-6 * (1.0 + Math.abs(lb));
                    xassert(mir.x[k] >= lb - eps);
                }
                /* determine upper bound */
                ub = mir.ub[k];
                kk = mir.vub[k];
                if (kk != 0)
                {  xassert(ub != +DBL_MAX);
                    xassert(!mir.isint[k]);
                    xassert(mir.isint[kk]);
                    ub *= mir.x[kk];
                }
                /* check upper bound */
                if (ub != +DBL_MAX)
                {  eps = 1e-6 * (1.0 + Math.abs(ub));
                    xassert(mir.x[k] <= ub + eps);
                }
            }
        }
    }

    function initial_agg_row(tree, mir, i){
        /* use original i-th row as initial aggregated constraint */
        var mip = tree.mip;
        var m = mir.m;
        var aij;
        xassert(1 <= i && i <= m);
        xassert(!mir.skip[i]);
        /* mark i-th row in order not to use it in the same aggregated
         constraint */
        mir.skip[i] = 2;
        mir.agg_cnt = 1;
        mir.agg_row[1] = i;
        /* use x[i] - sum a[i,j] * x[m+j] = 0, where x[i] is auxiliary
         variable of row i, x[m+j] are structural variables */
        ios_clear_vec(mir.agg_vec);
        ios_set_vj(mir.agg_vec, i, 1.0);
        for (aij = mip.row[i].ptr; aij != null; aij = aij.r_next)
            ios_set_vj(mir.agg_vec, m + aij.col.j, - aij.val);
        mir.agg_rhs = 0.0;
        if (_MIR_DEBUG){
            ios_check_vec(mir.agg_vec);
        }
    }

    if (_MIR_DEBUG){
        function check_agg_row(mir)
        {     /* check aggregated constraint */
            var m = mir.m;
            var n = mir.n;
            var j, k;
            var r, big;
            /* compute the residual r = sum a[k] * x[k] - b and determine
             big = max(1, |a[k]|, |b|) */
            r = 0.0; big = 1.0;
            for (j = 1; j <= mir.agg_vec.nnz; j++)
            {  k = mir.agg_vec.ind[j];
                xassert(1 <= k && k <= m+n);
                r += mir.agg_vec.val[j] * mir.x[k];
                if (big < Math.abs(mir.agg_vec.val[j]))
                    big = Math.abs(mir.agg_vec.val[j]);
            }
            r -= mir.agg_rhs;
            if (big < Math.abs(mir.agg_rhs))
                big = Math.abs(mir.agg_rhs);
            /* the residual must be close to zero */
            xassert(Math.abs(r) <= 1e-6 * big);
        }
    }

    function subst_fixed_vars(mir){
        /* substitute fixed variables into aggregated constraint */
        var m = mir.m;
        var n = mir.n;
        var j, k;
        for (j = 1; j <= mir.agg_vec.nnz; j++)
        {  k = mir.agg_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            if (mir.vlb[k] == 0 && mir.vub[k] == 0 &&
                mir.lb[k] == mir.ub[k])
            {  /* x[k] is fixed */
                mir.agg_rhs -= mir.agg_vec.val[j] * mir.lb[k];
                mir.agg_vec.val[j] = 0.0;
            }
        }
        /* remove terms corresponding to fixed variables */
        ios_clean_vec(mir.agg_vec, DBL_EPSILON);
        if (_MIR_DEBUG){
            ios_check_vec(mir.agg_vec);
        }
    }

    function bound_subst_heur(mir){
        /* bound substitution heuristic */
        var m = mir.m;
        var n = mir.n;
        var j, k, kk;
        var d1, d2;
        for (j = 1; j <= mir.agg_vec.nnz; j++)
        {  k = mir.agg_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            if (mir.isint[k]) continue; /* skip integer variable */
            /* compute distance from x[k] to its lower bound */
            kk = mir.vlb[k];
            if (kk == 0)
            {  if (mir.lb[k] == -DBL_MAX)
                d1 = DBL_MAX;
            else
                d1 = mir.x[k] - mir.lb[k];
            }
            else
            {  xassert(1 <= kk && kk <= m+n);
                xassert(mir.isint[kk]);
                xassert(mir.lb[k] != -DBL_MAX);
                d1 = mir.x[k] - mir.lb[k] * mir.x[kk];
            }
            /* compute distance from x[k] to its upper bound */
            kk = mir.vub[k];
            if (kk == 0)
            {  if (mir.vub[k] == +DBL_MAX)
                d2 = DBL_MAX;
            else
                d2 = mir.ub[k] - mir.x[k];
            }
            else
            {  xassert(1 <= kk && kk <= m+n);
                xassert(mir.isint[kk]);
                xassert(mir.ub[k] != +DBL_MAX);
                d2 = mir.ub[k] * mir.x[kk] - mir.x[k];
            }
            /* x[k] cannot be free */
            xassert(d1 != DBL_MAX || d2 != DBL_MAX);
            /* choose the bound which is closer to x[k] */
            xassert(mir.subst[k] == '?');
            if (d1 <= d2)
                mir.subst[k] = 'L';
            else
                mir.subst[k] = 'U';
        }
    }

    function build_mod_row(mir){
        /* substitute bounds and build modified constraint */
        var m = mir.m;
        var n = mir.n;
        var j, jj, k, kk;
        /* initially modified constraint is aggregated constraint */
        ios_copy_vec(mir.mod_vec, mir.agg_vec);
        mir.mod_rhs = mir.agg_rhs;
        if (_MIR_DEBUG){
            ios_check_vec(mir.mod_vec);
        }
        /* substitute bounds for continuous variables; note that due to
         substitution of variable bounds additional terms may appear in
         modified constraint */
        for (j = mir.mod_vec.nnz; j >= 1; j--)
        {  k = mir.mod_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            if (mir.isint[k]) continue; /* skip integer variable */
            if (mir.subst[k] == 'L')
            {  /* x[k] = (lower bound) + x'[k] */
                xassert(mir.lb[k] != -DBL_MAX);
                kk = mir.vlb[k];
                if (kk == 0)
                {  /* x[k] = lb[k] + x'[k] */
                    mir.mod_rhs -= mir.mod_vec.val[j] * mir.lb[k];
                }
                else
                {  /* x[k] = lb[k] * x[kk] + x'[k] */
                    xassert(mir.isint[kk]);
                    jj = mir.mod_vec.pos[kk];
                    if (jj == 0)
                    {  ios_set_vj(mir.mod_vec, kk, 1.0);
                        jj = mir.mod_vec.pos[kk];
                        mir.mod_vec.val[jj] = 0.0;
                    }
                    mir.mod_vec.val[jj] +=
                        mir.mod_vec.val[j] * mir.lb[k];
                }
            }
            else if (mir.subst[k] == 'U')
            {  /* x[k] = (upper bound) - x'[k] */
                xassert(mir.ub[k] != +DBL_MAX);
                kk = mir.vub[k];
                if (kk == 0)
                {  /* x[k] = ub[k] - x'[k] */
                    mir.mod_rhs -= mir.mod_vec.val[j] * mir.ub[k];
                }
                else
                {  /* x[k] = ub[k] * x[kk] - x'[k] */
                    xassert(mir.isint[kk]);
                    jj = mir.mod_vec.pos[kk];
                    if (jj == 0)
                    {  ios_set_vj(mir.mod_vec, kk, 1.0);
                        jj = mir.mod_vec.pos[kk];
                        mir.mod_vec.val[jj] = 0.0;
                    }
                    mir.mod_vec.val[jj] +=
                        mir.mod_vec.val[j] * mir.ub[k];
                }
                mir.mod_vec.val[j] = - mir.mod_vec.val[j];
            }
            else
                xassert(k != k);
        }
        if (_MIR_DEBUG){
            ios_check_vec(mir.mod_vec);
        }
        /* substitute bounds for integer variables */
        for (j = 1; j <= mir.mod_vec.nnz; j++)
        {  k = mir.mod_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            if (!mir.isint[k]) continue; /* skip continuous variable */
            xassert(mir.subst[k] == '?');
            xassert(mir.vlb[k] == 0 && mir.vub[k] == 0);
            xassert(mir.lb[k] != -DBL_MAX && mir.ub[k] != +DBL_MAX);
            if (Math.abs(mir.lb[k]) <= Math.abs(mir.ub[k]))
            {  /* x[k] = lb[k] + x'[k] */
                mir.subst[k] = 'L';
                mir.mod_rhs -= mir.mod_vec.val[j] * mir.lb[k];
            }
            else
            {  /* x[k] = ub[k] - x'[k] */
                mir.subst[k] = 'U';
                mir.mod_rhs -= mir.mod_vec.val[j] * mir.ub[k];
                mir.mod_vec.val[j] = - mir.mod_vec.val[j];
            }
        }
        if (_MIR_DEBUG){
            ios_check_vec(mir.mod_vec);
        }
    }

    if (_MIR_DEBUG){
        function check_mod_row(mir){
            /* check modified constraint */
            var m = mir.m;
            var n = mir.n;
            var j, k, kk;
            var r, big, x;
            /* compute the residual r = sum a'[k] * x'[k] - b' and determine
             big = max(1, |a[k]|, |b|) */
            r = 0.0; big = 1.0;
            for (j = 1; j <= mir.mod_vec.nnz; j++)
            {  k = mir.mod_vec.ind[j];
                xassert(1 <= k && k <= m+n);
                if (mir.subst[k] == 'L')
                {  /* x'[k] = x[k] - (lower bound) */
                    xassert(mir.lb[k] != -DBL_MAX);
                    kk = mir.vlb[k];
                    if (kk == 0)
                        x = mir.x[k] - mir.lb[k];
                    else
                        x = mir.x[k] - mir.lb[k] * mir.x[kk];
                }
                else if (mir.subst[k] == 'U')
                {  /* x'[k] = (upper bound) - x[k] */
                    xassert(mir.ub[k] != +DBL_MAX);
                    kk = mir.vub[k];
                    if (kk == 0)
                        x = mir.ub[k] - mir.x[k];
                    else
                        x = mir.ub[k] * mir.x[kk] - mir.x[k];
                }
                else
                    xassert(k != k);
                r += mir.mod_vec.val[j] * x;
                if (big < Math.abs(mir.mod_vec.val[j]))
                    big = Math.abs(mir.mod_vec.val[j]);
            }
            r -= mir.mod_rhs;
            if (big < Math.abs(mir.mod_rhs))
                big = Math.abs(mir.mod_rhs);
            /* the residual must be close to zero */
            xassert(Math.abs(r) <= 1e-6 * big);
        }
    }

    function generate(mir){
        /* try to generate violated c-MIR cut for modified constraint */
        var m = mir.m;
        var n = mir.n;
        var j, k, kk, nint;
        var s, u, x, alpha, r_best = 0.0, b, beta = null, gamma = null;
        ios_copy_vec(mir.cut_vec, mir.mod_vec);
        mir.cut_rhs = mir.mod_rhs;
        /* remove small terms, which can appear due to substitution of
         variable bounds */
        ios_clean_vec(mir.cut_vec, DBL_EPSILON);
        if (_MIR_DEBUG){
            ios_check_vec(mir.cut_vec);
        }
        /* remove positive continuous terms to obtain MK relaxation */
        for (j = 1; j <= mir.cut_vec.nnz; j++)
        {  k = mir.cut_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            if (!mir.isint[k] && mir.cut_vec.val[j] > 0.0)
                mir.cut_vec.val[j] = 0.0;
        }
        ios_clean_vec(mir.cut_vec, 0.0);
        if (_MIR_DEBUG){
            ios_check_vec(mir.cut_vec);
        }
        /* move integer terms to the beginning of the sparse vector and
         determine the number of integer variables */
        nint = 0;
        for (j = 1; j <= mir.cut_vec.nnz; j++)
        {  k = mir.cut_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            if (mir.isint[k])
            {  var temp;
                nint++;
                /* interchange elements [nint] and [j] */
                kk = mir.cut_vec.ind[nint];
                mir.cut_vec.pos[k] = nint;
                mir.cut_vec.pos[kk] = j;
                mir.cut_vec.ind[nint] = k;
                mir.cut_vec.ind[j] = kk;
                temp = mir.cut_vec.val[nint];
                mir.cut_vec.val[nint] = mir.cut_vec.val[j];
                mir.cut_vec.val[j] = temp;
            }
        }
        if (_MIR_DEBUG){
            ios_check_vec(mir.cut_vec);
        }
        /* if there is no integer variable, nothing to generate */
        if (nint == 0) return r_best;
        /* allocate working arrays */
        u = new Array(1+nint);
        x = new Array(1+nint);
        alpha = new Array(1+nint);
        /* determine u and x */
        for (j = 1; j <= nint; j++)
        {  k = mir.cut_vec.ind[j];
            xassert(m+1 <= k && k <= m+n);
            xassert(mir.isint[k]);
            u[j] = mir.ub[k] - mir.lb[k];
            xassert(u[j] >= 1.0);
            if (mir.subst[k] == 'L')
                x[j] = mir.x[k] - mir.lb[k];
            else if (mir.subst[k] == 'U')
                x[j] = mir.ub[k] - mir.x[k];
            else
                xassert(k != k);
            xassert(x[j] >= -0.001);
            if (x[j] < 0.0) x[j] = 0.0;
        }
        /* compute s = - sum of continuous terms */
        s = 0.0;
        for (j = nint+1; j <= mir.cut_vec.nnz; j++)
        {
            k = mir.cut_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            /* must be continuous */
            xassert(!mir.isint[k]);
            if (mir.subst[k] == 'L')
            {  xassert(mir.lb[k] != -DBL_MAX);
                kk = mir.vlb[k];
                if (kk == 0)
                    x = mir.x[k] - mir.lb[k];
                else
                    x = mir.x[k] - mir.lb[k] * mir.x[kk];
            }
            else if (mir.subst[k] == 'U')
            {  xassert(mir.ub[k] != +DBL_MAX);
                kk = mir.vub[k];
                if (kk == 0)
                    x = mir.ub[k] - mir.x[k];
                else
                    x = mir.ub[k] * mir.x[kk] - mir.x[k];
            }
            else
                xassert(k != k);
            xassert(x >= -0.001);
            if (x < 0.0) x = 0.0;
            s -= mir.cut_vec.val[j] * x;
        }
        xassert(s >= 0.0);
        /* apply heuristic to obtain most violated c-MIR inequality */
        b = mir.cut_rhs;
        r_best = cmir_sep(nint, mir.cut_vec.val, b, u, x, s, alpha);
        if (r_best == 0.0) return r_best;
        xassert(r_best > 0.0);
        /* convert to raw cut */
        /* sum alpha[j] * x[j] <= beta + gamma * s */
        for (j = 1; j <= nint; j++)
            mir.cut_vec.val[j] = alpha[j];
        for (j = nint+1; j <= mir.cut_vec.nnz; j++)
        {  k = mir.cut_vec.ind[j];
            if (k <= m+n) mir.cut_vec.val[j] *= gamma;
        }
        mir.cut_rhs = beta;
        if (_MIR_DEBUG){
            ios_check_vec(mir.cut_vec);
        }
        return r_best;
    }

    if (_MIR_DEBUG){
        function check_raw_cut(mir, r_best){
            /* check raw cut before back bound substitution */
            var m = mir.m;
            var n = mir.n;
            var j, k, kk;
            var r, big, x;
            /* compute the residual r = sum a[k] * x[k] - b and determine
             big = max(1, |a[k]|, |b|) */
            r = 0.0; big = 1.0;
            for (j = 1; j <= mir.cut_vec.nnz; j++)
            {  k = mir.cut_vec.ind[j];
                xassert(1 <= k && k <= m+n);
                if (mir.subst[k] == 'L')
                {  xassert(mir.lb[k] != -DBL_MAX);
                    kk = mir.vlb[k];
                    if (kk == 0)
                        x = mir.x[k] - mir.lb[k];
                    else
                        x = mir.x[k] - mir.lb[k] * mir.x[kk];
                }
                else if (mir.subst[k] == 'U')
                {  xassert(mir.ub[k] != +DBL_MAX);
                    kk = mir.vub[k];
                    if (kk == 0)
                        x = mir.ub[k] - mir.x[k];
                    else
                        x = mir.ub[k] * mir.x[kk] - mir.x[k];
                }
                else
                    xassert(k != k);
                r += mir.cut_vec.val[j] * x;
                if (big < Math.abs(mir.cut_vec.val[j]))
                    big = Math.abs(mir.cut_vec.val[j]);
            }
            r -= mir.cut_rhs;
            if (big < Math.abs(mir.cut_rhs))
                big = Math.abs(mir.cut_rhs);
            /* the residual must be close to r_best */
            xassert(Math.abs(r - r_best) <= 1e-6 * big);
        }
    }

    function back_subst(mir){
        /* back substitution of original bounds */
        var m = mir.m;
        var n = mir.n;
        var j, jj, k, kk;
        /* at first, restore bounds of integer variables (because on
         restoring variable bounds of continuous variables we need
         original, not shifted, bounds of integer variables) */
        for (j = 1; j <= mir.cut_vec.nnz; j++)
        {  k = mir.cut_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            if (!mir.isint[k]) continue; /* skip continuous */
            if (mir.subst[k] == 'L')
            {  /* x'[k] = x[k] - lb[k] */
                xassert(mir.lb[k] != -DBL_MAX);
                xassert(mir.vlb[k] == 0);
                mir.cut_rhs += mir.cut_vec.val[j] * mir.lb[k];
            }
            else if (mir.subst[k] == 'U')
            {  /* x'[k] = ub[k] - x[k] */
                xassert(mir.ub[k] != +DBL_MAX);
                xassert(mir.vub[k] == 0);
                mir.cut_rhs -= mir.cut_vec.val[j] * mir.ub[k];
                mir.cut_vec.val[j] = - mir.cut_vec.val[j];
            }
            else
                xassert(k != k);
        }
        /* now restore bounds of continuous variables */
        for (j = 1; j <= mir.cut_vec.nnz; j++)
        {  k = mir.cut_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            if (mir.isint[k]) continue; /* skip integer */
            if (mir.subst[k] == 'L')
            {  /* x'[k] = x[k] - (lower bound) */
                xassert(mir.lb[k] != -DBL_MAX);
                kk = mir.vlb[k];
                if (kk == 0)
                {  /* x'[k] = x[k] - lb[k] */
                    mir.cut_rhs += mir.cut_vec.val[j] * mir.lb[k];
                }
                else
                {  /* x'[k] = x[k] - lb[k] * x[kk] */
                    jj = mir.cut_vec.pos[kk];
                    if (jj == 0)
                    {  ios_set_vj(mir.cut_vec, kk, 1.0);
                        jj = mir.cut_vec.pos[kk];
                        xassert(jj != 0);
                        mir.cut_vec.val[jj] = 0.0;
                    }
                    mir.cut_vec.val[jj] -= mir.cut_vec.val[j] *
                        mir.lb[k];
                }
            }
            else if (mir.subst[k] == 'U')
            {  /* x'[k] = (upper bound) - x[k] */
                xassert(mir.ub[k] != +DBL_MAX);
                kk = mir.vub[k];
                if (kk == 0)
                {  /* x'[k] = ub[k] - x[k] */
                    mir.cut_rhs -= mir.cut_vec.val[j] * mir.ub[k];
                }
                else
                {  /* x'[k] = ub[k] * x[kk] - x[k] */
                    jj = mir.cut_vec.pos[kk];
                    if (jj == 0)
                    {  ios_set_vj(mir.cut_vec, kk, 1.0);
                        jj = mir.cut_vec.pos[kk];
                        xassert(jj != 0);
                        mir.cut_vec.val[jj] = 0.0;
                    }
                    mir.cut_vec.val[jj] += mir.cut_vec.val[j] *
                        mir.ub[k];
                }
                mir.cut_vec.val[j] = - mir.cut_vec.val[j];
            }
            else
                xassert(k != k);
        }
        if (_MIR_DEBUG){
            ios_check_vec(mir.cut_vec);
        }
    }

    if (_MIR_DEBUG){
        function check_cut_row(mir, r_best){
            /* check the cut after back bound substitution or elimination of
             auxiliary variables */
            var m = mir.m;
            var n = mir.n;
            var j, k;
            var r, big;
            /* compute the residual r = sum a[k] * x[k] - b and determine
             big = max(1, |a[k]|, |b|) */
            r = 0.0; big = 1.0;
            for (j = 1; j <= mir.cut_vec.nnz; j++)
            {  k = mir.cut_vec.ind[j];
                xassert(1 <= k && k <= m+n);
                r += mir.cut_vec.val[j] * mir.x[k];
                if (big < Math.abs(mir.cut_vec.val[j]))
                    big = Math.abs(mir.cut_vec.val[j]);
            }
            r -= mir.cut_rhs;
            if (big < Math.abs(mir.cut_rhs))
                big = Math.abs(mir.cut_rhs);
            /* the residual must be close to r_best */
            xassert(Math.abs(r - r_best) <= 1e-6 * big);
        }
    }

    function subst_aux_vars(tree, mir){
        /* final substitution to eliminate auxiliary variables */
        var mip = tree.mip;
        var m = mir.m;
        var n = mir.n;
        var aij;
        var j, k, kk, jj;
        for (j = mir.cut_vec.nnz; j >= 1; j--)
        {  k = mir.cut_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            if (k > m) continue; /* skip structurals */
            for (aij = mip.row[k].ptr; aij != null; aij = aij.r_next)
            {  kk = m + aij.col.j; /* structural */
                jj = mir.cut_vec.pos[kk];
                if (jj == 0)
                {  ios_set_vj(mir.cut_vec, kk, 1.0);
                    jj = mir.cut_vec.pos[kk];
                    mir.cut_vec.val[jj] = 0.0;
                }
                mir.cut_vec.val[jj] += mir.cut_vec.val[j] * aij.val;
            }
            mir.cut_vec.val[j] = 0.0;
        }
        ios_clean_vec(mir.cut_vec, 0.0);
    }

    function add_cut(tree, mir){
        /* add constructed cut inequality to the cut pool */
        var m = mir.m;
        var n = mir.n;
        var j, k, len;
        var ind = new Array(1+n);
        var val = new Array(1+n);
        len = 0;
        for (j = mir.cut_vec.nnz; j >= 1; j--)
        {  k = mir.cut_vec.ind[j];
            xassert(m+1 <= k && k <= m+n);
            len++; ind[len] = k - m; val[len] = mir.cut_vec.val[j];
        }
        glp_ios_add_row(tree, null, GLP_RF_MIR, 0, len, ind, val, GLP_UP,
            mir.cut_rhs);
    }

    function aggregate_row(tree, mir){
        /* try to aggregate another row */
        var mip = tree.mip;
        var m = mir.m;
        var n = mir.n;
        var aij;
        var v;
        var ii, j, jj, k, kk, kappa = 0, ret = 0;
        var d1, d2, d, d_max = 0.0;
        /* choose appropriate structural variable in the aggregated row
         to be substituted */
        for (j = 1; j <= mir.agg_vec.nnz; j++)
        {  k = mir.agg_vec.ind[j];
            xassert(1 <= k && k <= m+n);
            if (k <= m) continue; /* skip auxiliary var */
            if (mir.isint[k]) continue; /* skip integer var */
            if (Math.abs(mir.agg_vec.val[j]) < 0.001) continue;
            /* compute distance from x[k] to its lower bound */
            kk = mir.vlb[k];
            if (kk == 0)
            {  if (mir.lb[k] == -DBL_MAX)
                d1 = DBL_MAX;
            else
                d1 = mir.x[k] - mir.lb[k];
            }
            else
            {  xassert(1 <= kk && kk <= m+n);
                xassert(mir.isint[kk]);
                xassert(mir.lb[k] != -DBL_MAX);
                d1 = mir.x[k] - mir.lb[k] * mir.x[kk];
            }
            /* compute distance from x[k] to its upper bound */
            kk = mir.vub[k];
            if (kk == 0)
            {  if (mir.vub[k] == +DBL_MAX)
                d2 = DBL_MAX;
            else
                d2 = mir.ub[k] - mir.x[k];
            }
            else
            {  xassert(1 <= kk && kk <= m+n);
                xassert(mir.isint[kk]);
                xassert(mir.ub[k] != +DBL_MAX);
                d2 = mir.ub[k] * mir.x[kk] - mir.x[k];
            }
            /* x[k] cannot be free */
            xassert(d1 != DBL_MAX || d2 != DBL_MAX);
            /* d = min(d1, d2) */
            d = (d1 <= d2 ? d1 : d2);
            xassert(d != DBL_MAX);
            /* should not be close to corresponding bound */
            if (d < 0.001) continue;
            if (d_max < d) {d_max = d; kappa = k}
        }
        if (kappa == 0)
        {  /* nothing chosen */
            ret = 1;
            return ret;
        }
        /* x[kappa] has been chosen */
        xassert(m+1 <= kappa && kappa <= m+n);
        xassert(!mir.isint[kappa]);
        /* find another row, which have not been used yet, to eliminate
         x[kappa] from the aggregated row */
        for (ii = 1; ii <= m; ii++)
        {  if (mir.skip[ii]) continue;
            for (aij = mip.row[ii].ptr; aij != null; aij = aij.r_next)
                if (aij.col.j == kappa - m) break;
            if (aij != null && Math.abs(aij.val) >= 0.001) break;
        }
        if (ii > m)
        {  /* nothing found */
            ret = 2;
            return ret;
        }
        /* row ii has been found; include it in the aggregated list */
        mir.agg_cnt++;
        xassert(mir.agg_cnt <= MAXAGGR);
        mir.agg_row[mir.agg_cnt] = ii;
        mir.skip[ii] = 2;
        /* v := new row */
        v = ios_create_vec(m+n);
        ios_set_vj(v, ii, 1.0);
        for (aij = mip.row[ii].ptr; aij != null; aij = aij.r_next)
            ios_set_vj(v, m + aij.col.j, - aij.val);
        if (_MIR_DEBUG){
            ios_check_vec(v);
        }
        /* perform gaussian elimination to remove x[kappa] */
        j = mir.agg_vec.pos[kappa];
        xassert(j != 0);
        jj = v.pos[kappa];
        xassert(jj != 0);
        ios_linear_comb(mir.agg_vec, - mir.agg_vec.val[j] / v.val[jj], v);
        ios_set_vj(mir.agg_vec, kappa, 0.0);
        if (_MIR_DEBUG){
            ios_check_vec(mir.agg_vec);
        }
        return ret;
    }

    /* main routine to generate MIR cuts */
    var mip = tree.mip;
    var m = mir.m;
    var n = mir.n;
    var i, k;
    var r_best;
    xassert(mip.m >= m);
    xassert(mip.n == n);
    /* obtain current point */
    get_current_point(tree, mir);
    if (_MIR_DEBUG){
        /* check current point */
        check_current_point(mir);
    }
    /* reset bound substitution flags */
    xfillArr(mir.subst, 1, '?', m+n);
    /* try to generate a set of violated MIR cuts */
    for (i = 1; i <= m; i++)
    {  if (mir.skip[i]) continue;
        /* use original i-th row as initial aggregated constraint */
        initial_agg_row(tree, mir, i);
        while (true){
            if (_MIR_DEBUG){
                /* check aggregated row */
                check_agg_row(mir);
            }
            /* substitute fixed variables into aggregated constraint */
            subst_fixed_vars(mir);
            if (_MIR_DEBUG){
                /* check aggregated row */
                check_agg_row(mir);
                /* check bound substitution flags */
                {
                    for (k = 1; k <= m+n; k++)
                        xassert(mir.subst[k] == '?');
                }
            }
            /* apply bound substitution heuristic */
            bound_subst_heur(mir);
            /* substitute bounds and build modified constraint */
            build_mod_row(mir);
            if (_MIR_DEBUG){
                /* check modified row */
                check_mod_row(mir);
            }
            /* try to generate violated c-MIR cut for modified row */
            r_best = generate(mir);
            if (r_best > 0.0){
                /* success */
                if (_MIR_DEBUG){
                    /* check raw cut before back bound substitution */
                    check_raw_cut(mir, r_best);
                }
                /* back substitution of original bounds */
                back_subst(mir);
                if (_MIR_DEBUG){
                    /* check the cut after back bound substitution */
                    check_cut_row(mir, r_best);
                }
                /* final substitution to eliminate auxiliary variables */
                subst_aux_vars(tree, mir);
                if (_MIR_DEBUG){
                    /* check the cut after elimination of auxiliaries */
                    check_cut_row(mir, r_best);
                }
                /* add constructed cut inequality to the cut pool */
                add_cut(tree, mir);
            }
            /* reset bound substitution flags */
            {
                for (var j = 1; j <= mir.mod_vec.nnz; j++)
                {  k = mir.mod_vec.ind[j];
                    xassert(1 <= k && k <= m+n);
                    xassert(mir.subst[k] != '?');
                    mir.subst[k] = '?';
                }
            }
            if (r_best == 0.0)
            {  /* failure */
                if (mir.agg_cnt < MAXAGGR)
                {  /* try to aggregate another row */
                    if (aggregate_row(tree, mir) == 0) continue;
                }
            }
            break;
        }

        /* unmark rows used in the aggregated constraint */
        {  var ii;
            for (k = 1; k <= mir.agg_cnt; k++)
            {  ii = mir.agg_row[k];
                xassert(1 <= ii && ii <= m);
                xassert(mir.skip[ii] == 2);
                mir.skip[ii] = 0;
            }
        }
    }
}

function lpx_cover_cut(lp, len, ind, val, x){
    var alfa = null, beta = null;

    const MAXTRY = 1000;

    function cover2(n, a, b, u, x, y, cov){
        /* try to generate mixed cover cut using two-element cover */
        var i, j, try_ = 0, ret = 0;
        var eps, temp, rmax = 0.001;
        eps = 0.001 * (1.0 + Math.abs(b));
        for (i = 1; i <= n; i++)
            for (j = i+1; j <= n; j++)
            {  /* C = {i, j} */
                try_++;
                if (try_ > MAXTRY) return ret;
                /* check if condition (8) is satisfied */
                if (a[i] + a[j] + y > b + eps)
                {  /* compute parameters for inequality (15) */
                    temp = a[i] + a[j] - b;
                    alfa = 1.0 / (temp + u);
                    beta = 2.0 - alfa * temp;
                    /* compute violation of inequality (15) */
                    temp = x[i] + x[j] + alfa * y - beta;
                    /* choose C providing maximum violation */
                    if (rmax < temp)
                    {  rmax = temp;
                        cov[1] = i;
                        cov[2] = j;
                        ret = 1;
                    }
                }
            }
        return ret;
    }

    function cover3(n, a, b, u, x, y, cov){
        /* try to generate mixed cover cut using three-element cover */
        var i, j, k, try_ = 0, ret = 0;
        var eps, temp, rmax = 0.001;
        eps = 0.001 * (1.0 + Math.abs(b));
        for (i = 1; i <= n; i++)
            for (j = i+1; j <= n; j++)
                for (k = j+1; k <= n; k++)
                {  /* C = {i, j, k} */
                    try_++;
                    if (try_ > MAXTRY) return ret;
                    /* check if condition (8) is satisfied */
                    if (a[i] + a[j] + a[k] + y > b + eps)
                    {  /* compute parameters for inequality (15) */
                        temp = a[i] + a[j] + a[k] - b;
                        alfa = 1.0 / (temp + u);
                        beta = 3.0 - alfa * temp;
                        /* compute violation of inequality (15) */
                        temp = x[i] + x[j] + x[k] + alfa * y - beta;
                        /* choose C providing maximum violation */
                        if (rmax < temp)
                        {  rmax = temp;
                            cov[1] = i;
                            cov[2] = j;
                            cov[3] = k;
                            ret = 1;
                        }
                    }
                }
        return ret;
    }

    function cover4(n, a, b, u, x, y, cov){
        /* try_ to generate mixed cover cut using four-element cover */
        var i, j, k, l, try_ = 0, ret = 0;
        var eps, temp, rmax = 0.001;
        eps = 0.001 * (1.0 + Math.abs(b));
        for (i = 1; i <= n; i++)
            for (j = i+1; j <= n; j++)
                for (k = j+1; k <= n; k++)
                    for (l = k+1; l <= n; l++)
                    {  /* C = {i, j, k, l} */
                        try_++;
                        if (try_ > MAXTRY) return ret;
                        /* check if condition (8) is satisfied */
                        if (a[i] + a[j] + a[k] + a[l] + y > b + eps)
                        {  /* compute parameters for inequality (15) */
                            temp = a[i] + a[j] + a[k] + a[l] - b;
                            alfa = 1.0 / (temp + u);
                            beta = 4.0 - alfa * temp;
                            /* compute violation of inequality (15) */
                            temp = x[i] + x[j] + x[k] + x[l] + alfa * y - beta;
                            /* choose C providing maximum violation */
                            if (rmax < temp)
                            {  rmax = temp;
                                cov[1] = i;
                                cov[2] = j;
                                cov[3] = k;
                                cov[4] = l;
                                ret = 1;
                            }
                        }
                    }
        return ret;
    }

    function cover(n, a, b, u, x, y, cov){
        /* try to generate mixed cover cut;
         input (see (5)):
         n        is the number of binary variables;
         a[1:n]   are coefficients at binary variables;
         b        is the right-hand side;
         u        is upper bound of continuous variable;
         x[1:n]   are values of binary variables at current point;
         y        is value of continuous variable at current point;
         output (see (15), (16), (17)):
         cov[1:r] are indices of binary variables included in cover C,
         where r is the set cardinality returned on exit;
         alfa     coefficient at continuous variable;
         beta     is the right-hand side; */
        var j;
        /* perform some sanity checks */
        xassert(n >= 2);
        for (j = 1; j <= n; j++) xassert(a[j] > 0.0);
        xassert(b > -1e-5);
        xassert(u >= 0.0);
        for (j = 1; j <= n; j++) xassert(0.0 <= x[j] && x[j] <= 1.0);
        xassert(0.0 <= y && y <= u);
        /* try to generate mixed cover cut */
        if (cover2(n, a, b, u, x, y, cov)) return 2;
        if (cover3(n, a, b, u, x, y, cov)) return 3;
        if (cover4(n, a, b, u, x, y, cov)) return 4;
        return 0;
    }



    var cov = new Array(1+4), j, k, nb, newlen, r;
    var f_min, f_max, u, y;
    /* substitute and remove fixed variables */
    newlen = 0;
    for (k = 1; k <= len; k++)
    {  j = ind[k];
        if (lpx_get_col_type(lp, j) == LPX_FX)
            val[0] -= val[k] * lpx_get_col_lb(lp, j);
        else
        {  newlen++;
            ind[newlen] = ind[k];
            val[newlen] = val[k];
        }
    }
    len = newlen;
    /* move binary variables to the beginning of the list so that
     elements 1, 2, ..., nb correspond to binary variables, and
     elements nb+1, nb+2, ..., len correspond to rest variables */
    nb = 0;
    for (k = 1; k <= len; k++)
    {  j = ind[k];
        if (lpx_get_col_kind(lp, j) == LPX_IV &&
            lpx_get_col_type(lp, j) == LPX_DB &&
            lpx_get_col_lb(lp, j) == 0.0 &&
            lpx_get_col_ub(lp, j) == 1.0)
        {  /* binary variable */
            var ind_k;
            var val_k;
            nb++;
            ind_k = ind[nb]; val_k = val[nb];
            ind[nb] = ind[k]; val[nb] = val[k];
            ind[k] = ind_k; val[k] = val_k;
        }
    }
    /* now the specified row has the form:
     sum a[j]*x[j] + sum a[j]*y[j] <= b,
     where x[j] are binary variables, y[j] are rest variables */
    /* at least two binary variables are needed */
    if (nb < 2) return 0;
    /* compute implied lower and upper bounds for sum a[j]*y[j] */
    f_min = f_max = 0.0;
    for (k = nb+1; k <= len; k++)
    {  j = ind[k];
        /* both bounds must be finite */
        if (lpx_get_col_type(lp, j) != LPX_DB) return 0;
        if (val[k] > 0.0)
        {  f_min += val[k] * lpx_get_col_lb(lp, j);
            f_max += val[k] * lpx_get_col_ub(lp, j);
        }
        else
        {  f_min += val[k] * lpx_get_col_ub(lp, j);
            f_max += val[k] * lpx_get_col_lb(lp, j);
        }
    }
    /* sum a[j]*x[j] + sum a[j]*y[j] <= b ===>
     sum a[j]*x[j] + (sum a[j]*y[j] - f_min) <= b - f_min ===>
     sum a[j]*x[j] + y <= b - f_min,
     where y = sum a[j]*y[j] - f_min;
     note that 0 <= y <= u, u = f_max - f_min */
    /* determine upper bound of y */
    u = f_max - f_min;
    /* determine value of y at the current point */
    y = 0.0;
    for (k = nb+1; k <= len; k++)
    {  j = ind[k];
        y += val[k] * lpx_get_col_prim(lp, j);
    }
    y -= f_min;
    if (y < 0.0) y = 0.0;
    if (y > u) y = u;
    /* modify the right-hand side b */
    val[0] -= f_min;
    /* now the transformed row has the form:
     sum a[j]*x[j] + y <= b, where 0 <= y <= u */
    /* determine values of x[j] at the current point */
    for (k = 1; k <= nb; k++)
    {  j = ind[k];
        x[k] = lpx_get_col_prim(lp, j);
        if (x[k] < 0.0) x[k] = 0.0;
        if (x[k] > 1.0) x[k] = 1.0;
    }
    /* if a[j] < 0, replace x[j] by its complement 1 - x'[j] */
    for (k = 1; k <= nb; k++)
    {  if (val[k] < 0.0)
    {  ind[k] = - ind[k];
        val[k] = - val[k];
        val[0] += val[k];
        x[k] = 1.0 - x[k];
    }
    }
    /* try to generate a mixed cover cut for the transformed row */
    r = cover(nb, val, val[0], u, x, y, cov);
    if (r == 0) return 0;
    xassert(2 <= r && r <= 4);
    /* now the cut is in the form:
     sum{j in C} x[j] + alfa * y <= beta */
    /* store the right-hand side beta */
    ind[0] = 0; val[0] = beta;
    /* restore the original ordinal numbers of x[j] */
    for (j = 1; j <= r; j++) cov[j] = ind[cov[j]];
    /* store cut coefficients at binary variables complementing back
     the variables having negative row coefficients */
    xassert(r <= nb);
    for (k = 1; k <= r; k++)
    {  if (cov[k] > 0)
    {  ind[k] = +cov[k];
        val[k] = +1.0;
    }
    else
    {  ind[k] = -cov[k];
        val[k] = -1.0;
        val[0] -= 1.0;
    }
    }
    /* substitute y = sum a[j]*y[j] - f_min */
    for (k = nb+1; k <= len; k++)
    {  r++;
        ind[r] = ind[k];
        val[r] = alfa * val[k];
    }
    val[0] += alfa * f_min;
    xassert(r <= len);
    len = r;
    return len;
}

function lpx_eval_row(lp, len, ind, val){
    var n = lpx_get_num_cols(lp);
    var j, k;
    var sum = 0.0;
    if (len < 0)
        xerror("lpx_eval_row: len = " + len + "; invalid row length");
    for (k = 1; k <= len; k++)
    {  j = ind[k];
        if (!(1 <= j && j <= n))
            xerror("lpx_eval_row: j = " + j + "; column number out of range");
        sum += val[k] * lpx_get_col_prim(lp, j);
    }
    return sum;
}

function ios_cov_gen(tree){
    var prob = tree.mip;
    var m = lpx_get_num_rows(prob);
    var n = lpx_get_num_cols(prob);
    var i, k, type, kase, len, ind;
    var r, val, work;
    xassert(lpx_get_status(prob) == LPX_OPT);
    /* allocate working arrays */
    ind = new Array(1+n);
    val = new Array(1+n);
    work = new Array(1+n);
    /* look through all rows */
    for (i = 1; i <= m; i++)
        for (kase = 1; kase <= 2; kase++)
        {  type = lpx_get_row_type(prob, i);
            if (kase == 1)
            {  /* consider rows of '<=' type */
                if (!(type == LPX_UP || type == LPX_DB)) continue;
                len = lpx_get_mat_row(prob, i, ind, val);
                val[0] = lpx_get_row_ub(prob, i);
            }
            else
            {  /* consider rows of '>=' type */
                if (!(type == LPX_LO || type == LPX_DB)) continue;
                len = lpx_get_mat_row(prob, i, ind, val);
                for (k = 1; k <= len; k++) val[k] = - val[k];
                val[0] = - lpx_get_row_lb(prob, i);
            }
            /* generate mixed cover cut:
             sum{j in J} a[j] * x[j] <= b */
            len = lpx_cover_cut(prob, len, ind, val, work);
            if (len == 0) continue;
            /* at the current point the cut inequality is violated, i.e.
             sum{j in J} a[j] * x[j] - b > 0 */
            r = lpx_eval_row(prob, len, ind, val) - val[0];
            if (r < 1e-3) continue;
            /* add the cut to the cut pool */
            glp_ios_add_row(tree, null, GLP_RF_COV, 0, len, ind, val,
                GLP_UP, val[0]);
        }
}


function lpx_create_cog(lp){
    const MAX_NB = 4000;
    const MAX_ROW_LEN = 500;

    function get_row_lb(lp, i){
        /* this routine returns lower bound of row i or -DBL_MAX if the
         row has no lower bound */
        var lb;
        switch (lpx_get_row_type(lp, i))
        {  case LPX_FR:
            case LPX_UP:
                lb = -DBL_MAX;
                break;
            case LPX_LO:
            case LPX_DB:
            case LPX_FX:
                lb = lpx_get_row_lb(lp, i);
                break;
            default:
                xassert(lp != lp);
        }
        return lb;
    }

    function get_row_ub(lp, i){
        /* this routine returns upper bound of row i or +DBL_MAX if the
         row has no upper bound */
        var ub;
        switch (lpx_get_row_type(lp, i))
        {  case LPX_FR:
            case LPX_LO:
                ub = +DBL_MAX;
                break;
            case LPX_UP:
            case LPX_DB:
            case LPX_FX:
                ub = lpx_get_row_ub(lp, i);
                break;
            default:
                xassert(lp != lp);
        }
        return ub;
    }

    function get_col_lb(lp, j){
        /* this routine returns lower bound of column j or -DBL_MAX if
         the column has no lower bound */
        var lb;
        switch (lpx_get_col_type(lp, j))
        {  case LPX_FR:
            case LPX_UP:
                lb = -DBL_MAX;
                break;
            case LPX_LO:
            case LPX_DB:
            case LPX_FX:
                lb = lpx_get_col_lb(lp, j);
                break;
            default:
                xassert(lp != lp);
        }
        return lb;
    }

    function get_col_ub(lp, j){
        /* this routine returns upper bound of column j or +DBL_MAX if
         the column has no upper bound */
        var ub;
        switch (lpx_get_col_type(lp, j))
        {  case LPX_FR:
            case LPX_LO:
                ub = +DBL_MAX;
                break;
            case LPX_UP:
            case LPX_DB:
            case LPX_FX:
                ub = lpx_get_col_ub(lp, j);
                break;
            default:
                xassert(lp != lp);
        }
        return ub;
    }

    function is_binary(lp, j){
        /* this routine checks if variable x[j] is binary */
        return lpx_get_col_kind(lp, j) == LPX_IV &&
            lpx_get_col_type(lp, j) == LPX_DB &&
            lpx_get_col_lb(lp, j) == 0.0 && lpx_get_col_ub(lp, j) == 1.0;
    }

    function eval_lf_min(lp, len, ind, val){
        /* this routine computes the minimum of a specified linear form

         sum a[j]*x[j]
         j

         using the formula:

         min =   sum   a[j]*lb[j] +   sum   a[j]*ub[j],
         j in J+              j in J-

         where J+ = {j: a[j] > 0}, J- = {j: a[j] < 0}, lb[j] and ub[j]
         are lower and upper bound of variable x[j], resp. */
        var j, t;
        var lb, ub, sum;
        sum = 0.0;
        for (t = 1; t <= len; t++)
        {  j = ind[t];
            if (val[t] > 0.0)
            {  lb = get_col_lb(lp, j);
                if (lb == -DBL_MAX)
                {  sum = -DBL_MAX;
                    break;
                }
                sum += val[t] * lb;
            }
            else if (val[t] < 0.0)
            {  ub = get_col_ub(lp, j);
                if (ub == +DBL_MAX)
                {  sum = -DBL_MAX;
                    break;
                }
                sum += val[t] * ub;
            }
            else
                xassert(val != val);
        }
        return sum;
    }

    function eval_lf_max(lp, len, ind, val){
        /* this routine computes the maximum of a specified linear form

         sum a[j]*x[j]
         j

         using the formula:

         max =   sum   a[j]*ub[j] +   sum   a[j]*lb[j],
         j in J+              j in J-

         where J+ = {j: a[j] > 0}, J- = {j: a[j] < 0}, lb[j] and ub[j]
         are lower and upper bound of variable x[j], resp. */
        var j, t;
        var lb, ub, sum;
        sum = 0.0;
        for (t = 1; t <= len; t++)
        {  j = ind[t];
            if (val[t] > 0.0)
            {  ub = get_col_ub(lp, j);
                if (ub == +DBL_MAX)
                {  sum = +DBL_MAX;
                    break;
                }
                sum += val[t] * ub;
            }
            else if (val[t] < 0.0)
            {  lb = get_col_lb(lp, j);
                if (lb == -DBL_MAX)
                {  sum = +DBL_MAX;
                    break;
                }
                sum += val[t] * lb;
            }
            else
                xassert(val != val);
        }
        return sum;
    }

    function probing(len, val, L, U, lf_min, lf_max, p, set, q){
        var temp;
        xassert(1 <= p && p < q && q <= len);
        /* compute L' (3) */
        if (L != -DBL_MAX && set) L -= val[p];
        /* compute U' (4) */
        if (U != +DBL_MAX && set) U -= val[p];
        /* compute MIN (9) */
        if (lf_min != -DBL_MAX)
        {  if (val[p] < 0.0) lf_min -= val[p];
            if (val[q] < 0.0) lf_min -= val[q];
        }
        /* compute MAX (10) */
        if (lf_max != +DBL_MAX)
        {  if (val[p] > 0.0) lf_max -= val[p];
            if (val[q] > 0.0) lf_max -= val[q];
        }
        /* compute implied lower bound of x[q]; see (7), (8) */
        if (val[q] > 0.0)
        {  if (L == -DBL_MAX || lf_max == +DBL_MAX)
            temp = -DBL_MAX;
        else
            temp = (L - lf_max) / val[q];
        }
        else
        {  if (U == +DBL_MAX || lf_min == -DBL_MAX)
            temp = -DBL_MAX;
        else
            temp = (U - lf_min) / val[q];
        }
        if (temp > 0.001) return 2;
        /* compute implied upper bound of x[q]; see (7), (8) */
        if (val[q] > 0.0)
        {  if (U == +DBL_MAX || lf_min == -DBL_MAX)
            temp = +DBL_MAX;
        else
            temp = (U - lf_min) / val[q];
        }
        else
        {  if (L == -DBL_MAX || lf_max == +DBL_MAX)
            temp = +DBL_MAX;
        else
            temp = (L - lf_max) / val[q];
        }
        if (temp < 0.999) return 1;
        /* there is no logical relation between x[p] and x[q] */
        return 0;
    }

    var cog = null;
    var m, n, nb, i, j, p, q, len, ind, vert, orig;
    var L, U, lf_min, lf_max, val;
    xprintf("Creating the conflict graph...");
    m = lpx_get_num_rows(lp);
    n = lpx_get_num_cols(lp);
    /* determine which binary variables should be included in the
     conflict graph */
    nb = 0;
    vert = new Array(1+n);
    for (j = 1; j <= n; j++) vert[j] = 0;
    orig = new Array(1+n);
    ind = new Array(1+n);
    val = new Array(1+n);
    for (i = 1; i <= m; i++)
    {  L = get_row_lb(lp, i);
        U = get_row_ub(lp, i);
        if (L == -DBL_MAX && U == +DBL_MAX) continue;
        len = lpx_get_mat_row(lp, i, ind, val);
        if (len > MAX_ROW_LEN) continue;
        lf_min = eval_lf_min(lp, len, ind, val);
        lf_max = eval_lf_max(lp, len, ind, val);
        for (p = 1; p <= len; p++)
        {  if (!is_binary(lp, ind[p])) continue;
            for (q = p+1; q <= len; q++)
            {  if (!is_binary(lp, ind[q])) continue;
                if (probing(len, val, L, U, lf_min, lf_max, p, 0, q) ||
                    probing(len, val, L, U, lf_min, lf_max, p, 1, q))
                {  /* there is a logical relation */
                    /* include the first variable in the graph */
                    j = ind[p];
                    if (vert[j] == 0) {nb++; vert[j] = nb; orig[nb] = j}
                    /* incude the second variable in the graph */
                    j = ind[q];
                    if (vert[j] == 0) {nb++; vert[j] = nb; orig[nb] = j}
                }
            }
        }
    }
    /* if the graph is either empty or has too many vertices, do not
     create it */
    if (nb == 0 || nb > MAX_NB)
    {  xprintf("The conflict graph is either empty or too big");
       return cog;
    }
    /* create the conflict graph */
    cog = {};
    cog.n = n;
    cog.nb = nb;
    cog.ne = 0;
    cog.vert = vert;
    cog.orig = orig;
    len = nb + nb; /* number of vertices */
    len = (len * (len - 1)) / 2; /* number of entries in triangle */
    len = (len + (CHAR_BIT - 1)) / CHAR_BIT; /* bytes needed */
    cog.a = new Array(len);
    xfillArr(cog.a, 0, 0, len);
    for (j = 1; j <= nb; j++)
    {  /* add edge between variable and its complement */
        lpx_add_cog_edge(cog, +orig[j], -orig[j]);
    }
    for (i = 1; i <= m; i++)
    {  L = get_row_lb(lp, i);
        U = get_row_ub(lp, i);
        if (L == -DBL_MAX && U == +DBL_MAX) continue;
        len = lpx_get_mat_row(lp, i, ind, val);
        if (len > MAX_ROW_LEN) continue;
        lf_min = eval_lf_min(lp, len, ind, val);
        lf_max = eval_lf_max(lp, len, ind, val);
        for (p = 1; p <= len; p++)
        {  if (!is_binary(lp, ind[p])) continue;
            for (q = p+1; q <= len; q++)
            {  if (!is_binary(lp, ind[q])) continue;
                /* set x[p] to 0 and examine x[q] */
                switch (probing(len, val, L, U, lf_min, lf_max, p, 0, q))
                {  case 0:
                    /* no logical relation */
                    break;
                    case 1:
                        /* x[p] = 0 implies x[q] = 0 */
                        lpx_add_cog_edge(cog, -ind[p], +ind[q]);
                        break;
                    case 2:
                        /* x[p] = 0 implies x[q] = 1 */
                        lpx_add_cog_edge(cog, -ind[p], -ind[q]);
                        break;
                    default:
                        xassert(lp != lp);
                }
                /* set x[p] to 1 and examine x[q] */
                switch (probing(len, val, L, U, lf_min, lf_max, p, 1, q))
                {  case 0:
                    /* no logical relation */
                    break;
                    case 1:
                        /* x[p] = 1 implies x[q] = 0 */
                        lpx_add_cog_edge(cog, +ind[p], +ind[q]);
                        break;
                    case 2:
                        /* x[p] = 1 implies x[q] = 1 */
                        lpx_add_cog_edge(cog, +ind[p], -ind[q]);
                        break;
                    default:
                        xassert(lp != lp);
                }
            }
        }
    }
    xprintf("The conflict graph has 2*" + cog.nb + " vertices and " + cog.ne + " edges");
    return cog;
}

function lpx_add_cog_edge(cog, i, j){
    var k;
    xassert(i != j);
    /* determine indices of corresponding vertices */
    if (i > 0)
    {  xassert(1 <= i && i <= cog.n);
        i = cog.vert[i];
        xassert(i != 0);
    }
    else
    {  i = -i;
        xassert(1 <= i && i <= cog.n);
        i = cog.vert[i];
        xassert(i != 0);
        i += cog.nb;
    }
    if (j > 0)
    {  xassert(1 <= j && j <= cog.n);
        j = cog.vert[j];
        xassert(j != 0);
    }
    else
    {  j = -j;
        xassert(1 <= j && j <= cog.n);
        j = cog.vert[j];
        xassert(j != 0);
        j += cog.nb;
    }
    /* only lower triangle is stored, so we need i > j */
    if (i < j){k = i; i = j; j = k}
    k = ((i - 1) * (i - 2)) / 2 + (j - 1);
    cog.a[k / CHAR_BIT] |=
        (1 << ((CHAR_BIT - 1) - k % CHAR_BIT));
    cog.ne++;
}

function lpx_clique_cut(lp, cog, ind, val){

    function is_edge(dsa, i, j) { return i == j ? 0 : i > j ? is_edge1(dsa, i, j) : is_edge1(dsa, j, i)}
    function is_edge1(dsa, i, j) {return is_edge2(dsa, (i * (i - 1)) / 2 + j)}
    function is_edge2(dsa, k){return (dsa.a[k / CHAR_BIT] & (1 << ((CHAR_BIT - 1) - k % CHAR_BIT)))}

    function sub(dsa, ct, table, level, weight, l_weight){
        var i, j, k, curr_weight, left_weight, p1, p2, newtable;
        newtable = new Array(dsa.n);
        if (ct <= 0)
        {  /* 0 or 1 elements left; include these */
            if (ct == 0)
            {  dsa.set[level++] = table[0];
                weight += l_weight;
            }
            if (weight > dsa.record)
            {  dsa.record = weight;
                dsa.rec_level = level;
                for (i = 0; i < level; i++) dsa.rec[i+1] = dsa.set[i];
            }
            return;
        }
        for (i = ct; i >= 0; i--)
        {  if ((level == 0) && (i < ct)) return;
            k = table[i];
            if ((level > 0) && (dsa.clique[k] <= (dsa.record - weight)))
                return; /* prune */
            dsa.set[level] = k;
            curr_weight = weight + dsa.wt[k+1];
            l_weight -= dsa.wt[k+1];
            if (l_weight <= (dsa.record - curr_weight))
                return; /* prune */
            p1 = 0;
            p2 = 0;
            left_weight = 0;
            while (p2 < table + i)
            {  j = table[p2]; p2++;
                if (is_edge(dsa, j, k))
                {  newtable[p1] = j; p1++;
                    left_weight += dsa.wt[j+1];
                }
            }
            if (left_weight <= (dsa.record - curr_weight)) continue;
            sub(dsa, p1 - 1, newtable, level + 1, curr_weight, left_weight);
        }
    }

    function wclique(_n, w, _a, sol){
        var dsa = {};
        var i, j, p, max_wt, max_nwt, wth, used, nwt, pos;
        var timer;
        dsa.n = _n;
        dsa.wt = w;
        dsa.a = _a;
        dsa.record = 0;
        dsa.rec_level = 0;
        dsa.rec = sol;
        dsa.clique = new Array(dsa.n);
        dsa.set = new Array(dsa.n);
        used = new Array(dsa.n);
        nwt = new Array(dsa.n);
        pos = new Array(dsa.n);
        /* start timer */
        timer = xtime();
        /* order vertices */
        for (i = 0; i < dsa.n; i++)
        {  nwt[i] = 0;
            for (j = 0; j < dsa.n; j++)
                if (is_edge(dsa, i, j)) nwt[i] += dsa.wt[j+1];
        }
        for (i = 0; i < dsa.n; i++)
            used[i] = 0;
        for (i = dsa.n-1; i >= 0; i--)
        {  max_wt = -1;
            max_nwt = -1;
            for (j = 0; j < dsa.n; j++)
            {  if ((!used[j]) && ((dsa.wt[j+1] > max_wt) || (dsa.wt[j+1] == max_wt
                && nwt[j] > max_nwt)))
            {  max_wt = dsa.wt[j+1];
                max_nwt = nwt[j];
                p = j;
            }
            }
            pos[i] = p;
            used[p] = 1;
            for (j = 0; j < dsa.n; j++)
                if ((!used[j]) && (j != p) && (is_edge(dsa, p, j)))
                    nwt[j] -= dsa.wt[p+1];
        }
        /* main routine */
        wth = 0;
        for (i = 0; i < dsa.n; i++)
        {  wth += dsa.wt[pos[i]+1];
            sub(dsa, i, pos, 0, 0, wth);
            dsa.clique[pos[i]] = dsa.record;
            if (xdifftime(xtime(), timer) >= 5.0 - 0.001)
            {  /* print current record and reset timer */
                xprintf("level = " + i+1 + " (" + dsa.n + "); best = " + dsa.record + "");
                timer = xtime();
            }
        }
        /* return the solution found */
        for (i = 1; i <= dsa.rec_level; i++) sol[i]++;
        return dsa.rec_level;
    }

    var n = lpx_get_num_cols(lp);
    var j, t, v, card, temp, len = 0, w, sol;
    var x, sum, b, vec;
    /* allocate working arrays */
    w = new Array(1 + 2 * cog.nb);
    sol = new Array(1 + 2 * cog.nb);
    vec = new Array(1+n);
    /* assign weights to vertices of the conflict graph */
    for (t = 1; t <= cog.nb; t++)
    {  j = cog.orig[t];
        x = lpx_get_col_prim(lp, j);
        temp = (100.0 * x + 0.5);
        if (temp < 0) temp = 0;
        if (temp > 100) temp = 100;
        w[t] = temp;
        w[cog.nb + t] = 100 - temp;
    }
    /* find a clique of maximum weight */
    card = wclique(2 * cog.nb, w, cog.a, sol);
    /* compute the clique weight for unscaled values */
    sum = 0.0;
    for ( t = 1; t <= card; t++)
    {  v = sol[t];
        xassert(1 <= v && v <= 2 * cog.nb);
        if (v <= cog.nb)
        {  /* vertex v corresponds to binary variable x[j] */
            j = cog.orig[v];
            x = lpx_get_col_prim(lp, j);
            sum += x;
        }
        else
        {  /* vertex v corresponds to the complement of x[j] */
            j = cog.orig[v - cog.nb];
            x = lpx_get_col_prim(lp, j);
            sum += 1.0 - x;
        }
    }
    /* if the sum of binary variables and their complements in the
     clique greater than 1, the clique cut is violated */
    if (sum >= 1.01)
    {  /* construct the inquality */
        for (j = 1; j <= n; j++) vec[j] = 0;
        b = 1.0;
        for (t = 1; t <= card; t++)
        {  v = sol[t];
            if (v <= cog.nb)
            {  /* vertex v corresponds to binary variable x[j] */
                j = cog.orig[v];
                xassert(1 <= j && j <= n);
                vec[j] += 1.0;
            }
            else
            {  /* vertex v corresponds to the complement of x[j] */
                j = cog.orig[v - cog.nb];
                xassert(1 <= j && j <= n);
                vec[j] -= 1.0;
                b -= 1.0;
            }
        }
        xassert(len == 0);
        for (j = 1; j <= n; j++)
        {  if (vec[j] != 0.0)
        {  len++;
            ind[len] = j; val[len] = vec[j];
        }
        }
        ind[0] = 0; val[0] = b;
    }
    /* return to the calling program */
    return len;
}

function ios_clq_init(tree){
    /* initialize clique cut generator */
    var mip = tree.mip;
    xassert(mip != null);
    return lpx_create_cog(mip);
}

function ios_clq_gen(tree, gen){
    var n = lpx_get_num_cols(tree.mip);
    var len, ind;
    var val;
    xassert(gen != null);
    ind = new Array(1+n);
    val = new Array(1+n);
    len = lpx_clique_cut(tree.mip, gen, ind, val);
    if (len > 0)
    {  /* xprintf("len = %d", len); */
        glp_ios_add_row(tree, null, GLP_RF_CLQ, 0, len, ind, val, GLP_UP, val[0]);
    }
}

function ios_choose_var(T, callback){
    var j;
    if (T.parm.br_tech == GLP_BR_FFV)
    {  /* branch on first fractional variable */
        j = branch_first(T, callback);
    }
    else if (T.parm.br_tech == GLP_BR_LFV)
    {  /* branch on last fractional variable */
        j = branch_last(T, callback);
    }
    else if (T.parm.br_tech == GLP_BR_MFV)
    {  /* branch on most fractional variable */
        j = branch_mostf(T, callback);
    }
    else if (T.parm.br_tech == GLP_BR_DTH)
    {  /* branch using the heuristic by Dreebeck and Tomlin */
        j = branch_drtom(T, callback);
    }
    else if (T.parm.br_tech == GLP_BR_PCH)
    {  /* hybrid pseudocost heuristic */
        j = ios_pcost_branch(T, callback);
    }
    else
        xassert(T != T);
    return j;
}

function branch_first(T, callback){
    var j, next;
    var beta;
    /* choose the column to branch on */
    for (j = 1; j <= T.n; j++)
        if (T.non_int[j]) break;
    xassert(1 <= j && j <= T.n);
    /* select the branch to be solved next */
    beta = glp_get_col_prim(T.mip, j);
    if (beta - Math.floor(beta) < Math.ceil(beta) - beta)
        next = GLP_DN_BRNCH;
    else
        next = GLP_UP_BRNCH;
    callback(next);
    return j;
}

function branch_last(T, callback){
    var j, next;
    var beta;
    /* choose the column to branch on */
    for (j = T.n; j >= 1; j--)
        if (T.non_int[j]) break;
    xassert(1 <= j && j <= T.n);
    /* select the branch to be solved next */
    beta = glp_get_col_prim(T.mip, j);
    if (beta - Math.floor(beta) < Math.ceil(beta) - beta)
        next = GLP_DN_BRNCH;
    else
        next = GLP_UP_BRNCH;
    callback(next);
    return j;
}

function branch_mostf(T, callback){
    var j, jj, next;
    var beta, most, temp;
    /* choose the column to branch on */
    jj = 0; most = DBL_MAX;
    for (j = 1; j <= T.n; j++)
    {  if (T.non_int[j])
    {  beta = glp_get_col_prim(T.mip, j);
        temp = Math.floor(beta) + 0.5;
        if (most > Math.abs(beta - temp))
        {  jj = j; most = Math.abs(beta - temp);
            if (beta < temp)
                next = GLP_DN_BRNCH;
            else
                next = GLP_UP_BRNCH;
        }
    }
    }
    callback(next);
    return jj;
}

function branch_drtom(T, callback){
    var mip = T.mip;
    var m = mip.m;
    var n = mip.n;
    var non_int = T.non_int;
    var j, jj, k, t, next, kase, len, stat, ind;
    var x, dk, alfa, delta_j, delta_k, delta_z, dz_dn, dz_up,
        dd_dn, dd_up, degrad, val;
    /* basic solution of LP relaxation must be optimal */
    xassert(glp_get_status(mip) == GLP_OPT);
    /* allocate working arrays */
    ind = new Array(1+n);
    val = new Array(1+n);
    /* nothing has been chosen so far */
    jj = 0; degrad = -1.0;
    /* walk through the list of columns (structural variables) */
    for (j = 1; j <= n; j++)
    {  /* if j-th column is not marked as fractional, skip it */
        if (!non_int[j]) continue;
        /* obtain (fractional) value of j-th column in basic solution
         of LP relaxation */
        x = glp_get_col_prim(mip, j);
        /* since the value of j-th column is fractional, the column is
         basic; compute corresponding row of the simplex table */
        len = glp_eval_tab_row(mip, m+j, ind, val);
        /* the following fragment computes a change in the objective
         function: delta Z = new Z - old Z, where old Z is the
         objective value in the current optimal basis, and new Z is
         the objective value in the adjacent basis, for two cases:
         1) if new upper bound ub' = Math.floor(x[j]) is introduced for
         j-th column (down branch);
         2) if new lower bound lb' = Math.ceil(x[j]) is introduced for
         j-th column (up branch);
         since in both cases the solution remaining dual feasible
         becomes primal infeasible, one implicit simplex iteration
         is performed to determine the change delta Z;
         it is obvious that new Z, which is never better than old Z,
         is a lower (minimization) or upper (maximization) bound of
         the objective function for down- and up-branches. */
        for (kase = -1; kase <= +1; kase += 2)
        {  /* if kase < 0, the new upper bound of x[j] is introduced;
         in this case x[j] should decrease in order to leave the
         basis and go to its new upper bound */
            /* if kase > 0, the new lower bound of x[j] is introduced;
             in this case x[j] should increase in order to leave the
             basis and go to its new lower bound */
            /* apply the dual ratio test in order to determine which
             auxiliary or structural variable should enter the basis
             to keep dual feasibility */
            k = glp_dual_rtest(mip, len, ind, val, kase, 1e-9);
            if (k != 0) k = ind[k];
            /* if no non-basic variable has been chosen, LP relaxation
             of corresponding branch being primal infeasible and dual
             unbounded has no primal feasible solution; in this case
             the change delta Z is formally set to infinity */
            if (k == 0)
            {  delta_z =
                (T.mip.dir == GLP_MIN ? +DBL_MAX : -DBL_MAX);
            } else {
                /* row of the simplex table that corresponds to non-basic
                 variable x[k] choosen by the dual ratio test is:
                 x[j] = ... + alfa * x[k] + ...
                 where alfa is the influence coefficient (an element of
                 the simplex table row) */
                /* determine the coefficient alfa */
                for (t = 1; t <= len; t++) if (ind[t] == k) break;
                xassert(1 <= t && t <= len);
                alfa = val[t];
                /* since in the adjacent basis the variable x[j] becomes
                 non-basic, knowing its value in the current basis we can
                 determine its change delta x[j] = new x[j] - old x[j] */
                delta_j = (kase < 0 ? Math.floor(x) : Math.ceil(x)) - x;
                /* and knowing the coefficient alfa we can determine the
                 corresponding change delta x[k] = new x[k] - old x[k],
                 where old x[k] is a value of x[k] in the current basis,
                 and new x[k] is a value of x[k] in the adjacent basis */
                delta_k = delta_j / alfa;
                /* Tomlin noticed that if the variable x[k] is of integer
                 kind, its change cannot be less (eventually) than one in
                 the magnitude */
                if (k > m && glp_get_col_kind(mip, k-m) != GLP_CV)
                {  /* x[k] is structural integer variable */
                    if (Math.abs(delta_k - Math.floor(delta_k + 0.5)) > 1e-3)
                    {  if (delta_k > 0.0)
                        delta_k = Math.ceil(delta_k);  /* +3.14 . +4 */
                    else
                        delta_k = Math.floor(delta_k); /* -3.14 . -4 */
                    }
                }
                /* now determine the status and reduced cost of x[k] in the
                 current basis */
                if (k <= m)
                {  stat = glp_get_row_stat(mip, k);
                    dk = glp_get_row_dual(mip, k);
                }
                else
                {  stat = glp_get_col_stat(mip, k-m);
                    dk = glp_get_col_dual(mip, k-m);
                }
                /* if the current basis is dual degenerate, some reduced
                 costs which are close to zero may have wrong sign due to
                 round-off errors, so correct the sign of d[k] */
                switch (T.mip.dir)
                {  case GLP_MIN:
                    if (stat == GLP_NL && dk < 0.0 ||
                        stat == GLP_NU && dk > 0.0 ||
                        stat == GLP_NF) dk = 0.0;
                    break;
                    case GLP_MAX:
                        if (stat == GLP_NL && dk > 0.0 ||
                            stat == GLP_NU && dk < 0.0 ||
                            stat == GLP_NF) dk = 0.0;
                        break;
                    default:
                        xassert(T != T);
                }
                /* now knowing the change of x[k] and its reduced cost d[k]
                 we can compute the corresponding change in the objective
                 function delta Z = new Z - old Z = d[k] * delta x[k];
                 note that due to Tomlin's modification new Z can be even
                 worse than in the adjacent basis */
                delta_z = dk * delta_k;
            }

            /* new Z is never better than old Z, therefore the change
            delta Z is always non-negative (in case of minimization)
            or non-positive (in case of maximization) */
               switch (T.mip.dir)
               {  case GLP_MIN: xassert(delta_z >= 0.0); break;
                   case GLP_MAX: xassert(delta_z <= 0.0); break;
                   default: xassert(T != T);
               }
            /* save the change in the objective fnction for down- and
               up-branches, respectively */
            if (kase < 0) dz_dn = delta_z; else dz_up = delta_z;
        }
        /* thus, in down-branch no integer feasible solution can be
         better than Z + dz_dn, and in up-branch no integer feasible
         solution can be better than Z + dz_up, where Z is value of
         the objective function in the current basis */
        /* following the heuristic by Driebeck and Tomlin we choose a
         column (i.e. structural variable) which provides largest
         degradation of the objective function in some of branches;
         besides, we select the branch with smaller degradation to
         be solved next and keep other branch with larger degradation
         in the active list hoping to minimize the number of further
         backtrackings */
        if (degrad < Math.abs(dz_dn) || degrad < Math.abs(dz_up))
        {  jj = j;
            if (Math.abs(dz_dn) < Math.abs(dz_up))
            {  /* select down branch to be solved next */
                next = GLP_DN_BRNCH;
                degrad = Math.abs(dz_up);
            }
            else
            {  /* select up branch to be solved next */
                next = GLP_UP_BRNCH;
                degrad = Math.abs(dz_dn);
            }
            /* save the objective changes for printing */
            dd_dn = dz_dn; dd_up = dz_up;
            /* if down- or up-branch has no feasible solution, we does
             not need to consider other candidates (in principle, the
             corresponding branch could be pruned right now) */
            if (degrad == DBL_MAX) break;
        }
    }
    /* something must be chosen */
    xassert(1 <= jj && jj <= n);
    if (degrad < 1e-6 * (1.0 + 0.001 * Math.abs(mip.obj_val)))
    {  jj = branch_mostf(T, callback);
        return jj;
    }
    if (T.parm.msg_lev >= GLP_MSG_DBG)
    {  xprintf("branch_drtom: column " + jj + " chosen to branch on");
        if (Math.abs(dd_dn) == DBL_MAX)
            xprintf("branch_drtom: down-branch is infeasible");
        else
            xprintf("branch_drtom: down-branch bound is " + (lpx_get_obj_val(mip) + dd_dn) + "");
        if (Math.abs(dd_up) == DBL_MAX)
            xprintf("branch_drtom: up-branch   is infeasible");
        else
            xprintf("branch_drtom: up-branch   bound is " + (lpx_get_obj_val(mip) + dd_up) + "");
    }
    callback(next);
    return jj;
}

function ios_pcost_init(tree){
    /* initialize working data used on pseudocost branching */
    var n = tree.n, j;
    var csa = {};
    csa.dn_cnt = new Array(1+n);
    csa.dn_sum = new Array(1+n);
    csa.up_cnt = new Array(1+n);
    csa.up_sum = new Array(1+n);
    for (j = 1; j <= n; j++)
    {  csa.dn_cnt[j] = csa.up_cnt[j] = 0;
        csa.dn_sum[j] = csa.up_sum[j] = 0.0;
    }
    return csa;
}


function ios_pcost_update(tree){
    /* update history information for pseudocost branching */
    /* this routine is called every time when LP relaxation of the
     current subproblem has been solved to optimality with all lazy
     and cutting plane constraints included */
    var j;
    var dx, dz, psi;
    var csa = tree.pcost;
    xassert(csa != null);
    xassert(tree.curr != null);
    /* if the current subproblem is the root, skip updating */
    if (tree.curr.up == null) return;
    /* determine branching variable x[j], which was used in the
     parent subproblem to create the current subproblem */
    j = tree.curr.up.br_var;
    xassert(1 <= j && j <= tree.n);
    /* determine the change dx[j] = new x[j] - old x[j],
     where new x[j] is a value of x[j] in optimal solution to LP
     relaxation of the current subproblem, old x[j] is a value of
     x[j] in optimal solution to LP relaxation of the parent
     subproblem */
    dx = tree.mip.col[j].prim - tree.curr.up.br_val;
    xassert(dx != 0.0);
    /* determine corresponding change dz = new dz - old dz in the
     objective function value */
    dz = tree.mip.obj_val - tree.curr.up.lp_obj;
    /* determine per unit degradation of the objective function */
    psi = Math.abs(dz / dx);
    /* update history information */
    if (dx < 0.0)
    {  /* the current subproblem is down-branch */
        csa.dn_cnt[j]++;
        csa.dn_sum[j] += psi;
    }
    else /* dx > 0.0 */
    {  /* the current subproblem is up-branch */
        csa.up_cnt[j]++;
        csa.up_sum[j] += psi;
    }
}

function ios_pcost_free(tree){
    /* free working area used on pseudocost branching */
    var csa = tree.pcost;
    xassert(csa != null);
    tree.pcost = null;
}

function ios_pcost_branch(T, callback){
    function eval_degrad(P, j, bnd){
        /* compute degradation of the objective on fixing x[j] at given
         value with a limited number of dual simplex iterations */
        /* this routine fixes column x[j] at specified value bnd,
         solves resulting LP, and returns a lower bound to degradation
         of the objective, degrad >= 0 */
        var lp;
        var parm = {};
        var ret;
        var degrad;
        /* the current basis must be optimal */
        xassert(glp_get_status(P) == GLP_OPT);
        /* create a copy of P */
        lp = glp_create_prob();
        glp_copy_prob(lp, P, 0);
        /* fix column x[j] at specified value */
        glp_set_col_bnds(lp, j, GLP_FX, bnd, bnd);
        /* try to solve resulting LP */
        glp_init_smcp(parm);
        parm.msg_lev = GLP_MSG_OFF;
        parm.meth = GLP_DUAL;
        parm.it_lim = 30;
        parm.out_dly = 1000;
        parm.meth = GLP_DUAL;
        ret = glp_simplex(lp, parm);
        if (ret == 0 || ret == GLP_EITLIM)
        {  if (glp_get_prim_stat(lp) == GLP_NOFEAS)
        {  /* resulting LP has no primal feasible solution */
            degrad = DBL_MAX;
        }
        else if (glp_get_dual_stat(lp) == GLP_FEAS)
        {  /* resulting basis is optimal or at least dual feasible,
         so we have the correct lower bound to degradation */
            if (P.dir == GLP_MIN)
                degrad = lp.obj_val - P.obj_val;
            else if (P.dir == GLP_MAX)
                degrad = P.obj_val - lp.obj_val;
            else
                xassert(P != P);
            /* degradation cannot be negative by definition */
            /* note that the lower bound to degradation may be close
             to zero even if its exact value is zero due to round-off
             errors on computing the objective value */
            if (degrad < 1e-6 * (1.0 + 0.001 * Math.abs(P.obj_val)))
                degrad = 0.0;
        }
        else
        {  /* the final basis reported by the simplex solver is dual
         infeasible, so we cannot determine a non-trivial lower
         bound to degradation */
            degrad = 0.0;
        }
        }
        else
        {  /* the simplex solver failed */
            degrad = 0.0;
        }
        /* delete the copy of P */
        glp_delete_prob(lp);
        return degrad;
    }

    function eval_psi(T, j, brnch){
        /* compute estimation of pseudocost of variable x[j] for down-
         or up-branch */
        var csa = T.pcost;
        var beta, degrad, psi;
        xassert(csa != null);
        xassert(1 <= j && j <= T.n);
        if (brnch == GLP_DN_BRNCH)
        {  /* down-branch */
            if (csa.dn_cnt[j] == 0)
            {  /* initialize down pseudocost */
                beta = T.mip.col[j].prim;
                degrad = eval_degrad(T.mip, j, Math.floor(beta));
                if (degrad == DBL_MAX)
                {  psi = DBL_MAX;
                    return psi;
                }
                csa.dn_cnt[j] = 1;
                csa.dn_sum[j] = degrad / (beta - Math.floor(beta));
            }
            psi = csa.dn_sum[j] / csa.dn_cnt[j];
        }
        else if (brnch == GLP_UP_BRNCH)
        {  /* up-branch */
            if (csa.up_cnt[j] == 0)
            {  /* initialize up pseudocost */
                beta = T.mip.col[j].prim;
                degrad = eval_degrad(T.mip, j, Math.ceil(beta));
                if (degrad == DBL_MAX)
                {  psi = DBL_MAX;
                    return psi;
                }
                csa.up_cnt[j] = 1;
                csa.up_sum[j] = degrad / (Math.ceil(beta) - beta);
            }
            psi = csa.up_sum[j] / csa.up_cnt[j];
        }
        else
            xassert(brnch != brnch);
        return psi;
    }

    function progress(T){
        /* display progress of pseudocost initialization */
        var csa = T.pcost;
        var j, nv = 0, ni = 0;
        for (j = 1; j <= T.n; j++)
        {  if (glp_ios_can_branch(T, j))
        {  nv++;
            if (csa.dn_cnt[j] > 0 && csa.up_cnt[j] > 0) ni++;
        }
        }
        xprintf("Pseudocosts initialized for " + ni + " of " + nv + " variables");
    }

    /* choose branching variable with pseudocost branching */
    var t = xtime();
    var j, jjj, sel;
    var beta, psi, d1, d2, d, dmax;
    /* initialize the working arrays */
    if (T.pcost == null)
        T.pcost = ios_pcost_init(T);
    /* nothing has been chosen so far */
    jjj = 0; dmax = -1.0;
    /* go through the list of branching candidates */
    for (j = 1; j <= T.n; j++)
    {  if (!glp_ios_can_branch(T, j)) continue;
        /* determine primal value of x[j] in optimal solution to LP
         relaxation of the current subproblem */
        beta = T.mip.col[j].prim;
        /* estimate pseudocost of x[j] for down-branch */
        psi = eval_psi(T, j, GLP_DN_BRNCH);
        if (psi == DBL_MAX)
        {  /* down-branch has no primal feasible solution */
            jjj = j; sel = GLP_DN_BRNCH;
            callback(sel);
            return jjj;
        }
        /* estimate degradation of the objective for down-branch */
        d1 = psi * (beta - Math.floor(beta));
        /* estimate pseudocost of x[j] for up-branch */
        psi = eval_psi(T, j, GLP_UP_BRNCH);
        if (psi == DBL_MAX)
        {  /* up-branch has no primal feasible solution */
            jjj = j; sel = GLP_UP_BRNCH;
            callback(sel);
            return jjj;
        }
        /* estimate degradation of the objective for up-branch */
        d2 = psi * (Math.ceil(beta) - beta);
        /* determine d = max(d1, d2) */
        d = (d1 > d2 ? d1 : d2);
        /* choose x[j] which provides maximal estimated degradation of
         the objective either in down- or up-branch */
        if (dmax < d)
        {  dmax = d;
            jjj = j;
            /* continue the search from a subproblem, where degradation
             is less than in other one */
            sel = (d1 <= d2 ? GLP_DN_BRNCH : GLP_UP_BRNCH);
        }
        /* display progress of pseudocost initialization */
        if (T.parm.msg_lev >= GLP_ON)
        {  if (xdifftime(xtime(), t) >= 10.0)
        {  progress(T);
            t = xtime();
        }
        }
    }
    if (dmax == 0.0)
    {  /* no degradation is indicated; choose a variable having most
     fractional value */
        jjj = branch_mostf(T, callback);
        return jjj;
    }
    callback(sel);
    return jjj;
}

function ios_feas_pump(T){
    var P = T.mip;
    var n = P.n;
    var lp = null;
    var var_ = null;
    var rand = null;
    var col;
    var parm = {};
    var j, k, new_x, nfail, npass, nv, ret, stalling;
    var dist, tol;

    const
        start = 0,
        more = 1,
        pass = 2,
        loop = 3,
        skip = 4,
        done = 5;

    var label = start;

    while (true){
        var goto = null;
        switch (label){
            case start:
                xassert(glp_get_status(P) == GLP_OPT);
                /* this heuristic is applied only once on the root level */
                if (!(T.curr.level == 0 && T.curr.solved == 1)){goto = done; break}
                /* determine number of binary variables */
                nv = 0;
                for (j = 1; j <= n; j++)
                {  col = P.col[j];
                    /* if x[j] is continuous, skip it */
                    if (col.kind == GLP_CV) continue;
                    /* if x[j] is fixed, skip it */
                    if (col.type == GLP_FX) continue;
                    /* x[j] is non-fixed integer */
                    xassert(col.kind == GLP_IV);
                    if (col.type == GLP_DB && col.lb == 0.0 && col.ub == 1.0)
                    {  /* x[j] is binary */
                        nv++;
                    }
                    else
                    {  /* x[j] is general integer */
                        if (T.parm.msg_lev >= GLP_MSG_ALL)
                            xprintf("FPUMP heuristic cannot be applied due to genera"+
                                "l integer variables");
                        goto = done;
                        break;
                    }
                }
                if (goto != null) break;

                /* there must be at least one binary variable */
                if (nv == 0) {goto = done; break}
                if (T.parm.msg_lev >= GLP_MSG_ALL)
                    xprintf("Applying FPUMP heuristic...");
                /* build the list of binary variables */
                var_ = new Array(1+nv);
                xfillObjArr(var_, 1, nv);
                k = 0;
                for (j = 1; j <= n; j++)
                {  col = P.col[j];
                    if (col.kind == GLP_IV && col.type == GLP_DB)
                        var_[++k].j = j;
                }
                xassert(k == nv);
                /* create working problem object */
                lp = glp_create_prob();
            case more:
                /* copy the original problem object to keep it intact */
                glp_copy_prob(lp, P, GLP_OFF);
                /* we are interested to find an integer feasible solution, which
                 is better than the best known one */
                if (P.mip_stat == GLP_FEAS)
                {  var ind;
                    var val, bnd;
                    /* add a row and make it identical to the objective row */
                    glp_add_rows(lp, 1);
                    ind = new Array(1+n);
                    val = new Array(1+n);
                    for (j = 1; j <= n; j++)
                    {  ind[j] = j;
                        val[j] = P.col[j].coef;
                    }
                    glp_set_mat_row(lp, lp.m, n, ind, val);

                    /* introduce upper (minimization) or lower (maximization)
                     bound to the original objective function; note that this
                     additional constraint is not violated at the optimal point
                     to LP relaxation */
                    bnd = 0.1 * P.obj_val + 0.9 * P.mip_obj;
                    /* xprintf("bnd = %f", bnd); */
                    if (P.dir == GLP_MIN)
                        glp_set_row_bnds(lp, lp.m, GLP_UP, 0.0, bnd - P.c0);
                    else if (P.dir == GLP_MAX)
                        glp_set_row_bnds(lp, lp.m, GLP_LO, bnd - P.c0, 0.0);
                    else
                        xassert(P != P);
                }
                /* reset pass count */
                npass = 0;
                /* invalidate the rounded point */
                for (k = 1; k <= nv; k++)
                    var_[k].x = -1;
            case pass:
                /* next pass starts here */
                npass++;
                if (T.parm.msg_lev >= GLP_MSG_ALL)
                    xprintf("Pass " + npass + "");
                /* initialize minimal distance between the basic point and the
                 rounded one obtained during this pass */
                dist = DBL_MAX;
                /* reset failure count (the number of succeeded iterations failed
                 to improve the distance) */
                nfail = 0;
                /* if it is not the first pass, perturb the last rounded point
                 rather than construct it from the basic solution */
                if (npass > 1)
                {  var rho, temp;
                    if (rand == null)
                        rand = rng_create_rand();
                    for (k = 1; k <= nv; k++)
                    {  j = var_[k].j;
                        col = lp.col[j];
                        rho = rng_uniform(rand, -0.3, 0.7);
                        if (rho < 0.0) rho = 0.0;
                        temp = Math.abs(var_[k].x - col.prim);
                        if (temp + rho > 0.5) var_[k].x = 1 - var_[k].x;
                    }
                    goto = skip;
                    break;
                }
            case loop:
                /* innermost loop begins here */
                /* round basic solution (which is assumed primal feasible) */
                stalling = 1;
                for (k = 1; k <= nv; k++)
                {  col = lp.col[var_[k].j];
                    if (col.prim < 0.5)
                    {  /* rounded value is 0 */
                        new_x = 0;
                    }
                    else
                    {  /* rounded value is 1 */
                        new_x = 1;
                    }
                    if (var_[k].x != new_x)
                    {  stalling = 0;
                        var_[k].x = new_x;
                    }
                }
                /* if the rounded point has not changed (stalling), choose and
                 flip some its entries heuristically */
                if (stalling)
                {  /* compute d[j] = |x[j] - round(x[j])| */
                    for (k = 1; k <= nv; k++)
                    {  col = lp.col[var_[k].j];
                        var_[k].d = Math.abs(col.prim - var_[k].x);
                    }
                    /* sort the list of binary variables by descending d[j] */
                    xqsort(var_, 1, nv,
                        function(vx, vy){
                            /* comparison routine */
                            if (vx.d > vy.d)
                                return -1;
                            else if (vx.d < vy.d)
                                return +1;
                            else
                                return 0;
                        }
                    );
                    /* choose and flip some rounded components */
                    for (k = 1; k <= nv; k++)
                    {  if (k >= 5 && var_[k].d < 0.35 || k >= 10) break;
                        var_[k].x = 1 - var_[k].x;
                    }
                }
            case skip:
                /* check if the time limit has been exhausted */
                if (T.parm.tm_lim < INT_MAX &&
                    (T.parm.tm_lim - 1) <=
                        1000.0 * xdifftime(xtime(), T.tm_beg)) {goto = done; break}
                /* build the objective, which is the distance between the current
                 (basic) point and the rounded one */
                lp.dir = GLP_MIN;
                lp.c0 = 0.0;
                for (j = 1; j <= n; j++)
                    lp.col[j].coef = 0.0;
                for (k = 1; k <= nv; k++)
                {  j = var_[k].j;
                    if (var_[k].x == 0)
                        lp.col[j].coef = +1.0;
                    else
                    {  lp.col[j].coef = -1.0;
                        lp.c0 += 1.0;
                    }
                }
                /* minimize the distance with the simplex method */
                glp_init_smcp(parm);
                if (T.parm.msg_lev <= GLP_MSG_ERR)
                    parm.msg_lev = T.parm.msg_lev;
                else if (T.parm.msg_lev <= GLP_MSG_ALL)
                {  parm.msg_lev = GLP_MSG_ON;
                    parm.out_dly = 10000;
                }
                ret = glp_simplex(lp, parm);
                if (ret != 0)
                {  if (T.parm.msg_lev >= GLP_MSG_ERR)
                    xprintf("Warning: glp_simplex returned " + ret + "");
                    goto = done; break;
                }
                ret = glp_get_status(lp);
                if (ret != GLP_OPT)
                {  if (T.parm.msg_lev >= GLP_MSG_ERR)
                    xprintf("Warning: glp_get_status returned " + ret + "");
                    goto = done; break;
                }
                if (T.parm.msg_lev >= GLP_MSG_DBG)
                    xprintf("delta = " + lp.obj_val + "");
                /* check if the basic solution is integer feasible; note that it
                 may be so even if the minimial distance is positive */
                tol = 0.3 * T.parm.tol_int;
                for (k = 1; k <= nv; k++)
                {  col = lp.col[var_[k].j];
                    if (tol < col.prim && col.prim < 1.0 - tol) break;
                }
                if (k > nv)
                {  /* okay; the basic solution seems to be integer feasible */
                    var x = new Array(1+n);
                    for (j = 1; j <= n; j++)
                    {  x[j] = lp.col[j].prim;
                        if (P.col[j].kind == GLP_IV) x[j] = Math.floor(x[j] + 0.5);
                    }
                    /* reset direction and right-hand side of objective */
                    lp.c0  = P.c0;
                    lp.dir = P.dir;
                    /* fix integer variables */
                    for (k = 1; k <= nv; k++)
                    {  lp.col[var_[k].j].lb   = x[var_[k].j];
                        lp.col[var_[k].j].ub   = x[var_[k].j];
                        lp.col[var_[k].j].type = GLP_FX;
                    }
                    /* copy original objective function */
                    for (j = 1; j <= n; j++)
                        lp.col[j].coef = P.col[j].coef;
                    /* solve original LP and copy result */
                    ret = glp_simplex(lp, parm);
                    if (ret != 0)
                    {  if (T.parm.msg_lev >= GLP_MSG_ERR)
                        xprintf("Warning: glp_simplex returned " + ret + "");
                        goto = done; break;
                    }
                    ret = glp_get_status(lp);
                    if (ret != GLP_OPT)
                    {  if (T.parm.msg_lev >= GLP_MSG_ERR)
                        xprintf("Warning: glp_get_status returned " + ret + "");
                        goto = done; break;
                    }
                    for (j = 1; j <= n; j++)
                        if (P.col[j].kind != GLP_IV) x[j] = lp.col[j].prim;
                    ret = glp_ios_heur_sol(T, x);
                    if (ret == 0)
                    {  /* the integer solution is accepted */
                        if (ios_is_hopeful(T, T.curr.bound))
                        {  /* it is reasonable to apply the heuristic once again */
                            goto = more; break;
                        }
                        else
                        {  /* the best known integer feasible solution just found
                         is close to optimal solution to LP relaxation */
                            goto = done; break;
                        }
                    }
                }
                /* the basic solution is fractional */
                if (dist == DBL_MAX ||
                    lp.obj_val <= dist - 1e-6 * (1.0 + dist))
                {  /* the distance is reducing */
                    nfail = 0; dist = lp.obj_val;
                }
                else
                {  /* improving the distance failed */
                    nfail++;
                }
                if (nfail < 3) {goto = loop; break}
                if (npass < 5) {goto = pass; break}
            case done:
                /* delete working objects */
                if (lp != null) glp_delete_prob(lp);

        }
        if (goto == null) break;
        label = goto;
    }
}

function ios_process_cuts(T){

    function parallel(a, b, work){
        var aij;
        var s = 0.0, sa = 0.0, sb = 0.0, temp;
        for (aij = a.ptr; aij != null; aij = aij.next)
        {  work[aij.j] = aij.val;
            sa += aij.val * aij.val;
        }
        for (aij = b.ptr; aij != null; aij = aij.next)
        {  s += work[aij.j] * aij.val;
            sb += aij.val * aij.val;
        }
        for (aij = a.ptr; aij != null; aij = aij.next)
            work[aij.j] = 0.0;
        temp = Math.sqrt(sa) * Math.sqrt(sb);
        if (temp < DBL_EPSILON * DBL_EPSILON) temp = DBL_EPSILON;
        return s / temp;
    }

    var pool;
    var cut;
    var aij;
    var info;
    var k, kk, max_cuts, len, ret, ind;
    var val, work;
    /* the current subproblem must exist */
    xassert(T.curr != null);
    /* the pool must exist and be non-empty */
    pool = T.local;
    xassert(pool != null);
    xassert(pool.size > 0);
    /* allocate working arrays */
    info = new Array(1+pool.size);
    ind = new Array(1+T.n);
    val = new Array(1+T.n);
    work = new Array(1+T.n);
    for (k = 1; k <= T.n; k++) work[k] = 0.0;
    /* build the list of cuts stored in the cut pool */
    for (k = 0, cut = pool.head; cut != null; cut = cut.next){
        k++; info[k].cut = cut; info[k].flag = 0;
    }
    xassert(k == pool.size);
    /* estimate efficiency of all cuts in the cut pool */
    for (k = 1; k <= pool.size; k++)
    {  var temp, dy = null, dz = null;
        cut = info[k].cut;
        /* build the vector of cut coefficients and compute its
         Euclidean norm */
        len = 0; temp = 0.0;
        for (aij = cut.ptr; aij != null; aij = aij.next)
        {  xassert(1 <= aij.j && aij.j <= T.n);
            len++; ind[len] = aij.j; val[len] = aij.val;
            temp += aij.val * aij.val;
        }
        if (temp < DBL_EPSILON * DBL_EPSILON) temp = DBL_EPSILON;
        /* transform the cut to express it only through non-basic
         (auxiliary and structural) variables */
        len = glp_transform_row(T.mip, len, ind, val);
        /* determine change in the cut value and in the objective
         value for the adjacent basis by simulating one step of the
         dual simplex */
        ret = _glp_analyze_row(T.mip, len, ind, val, cut.type,
            cut.rhs, 1e-9,  function(piv, x, dx, y, dy_, dz_){dy = dy_; dz = dz_});
        /* determine normalized residual and lower bound to objective
         degradation */
        if (ret == 0)
        {  info[k].eff = Math.abs(dy) / Math.sqrt(temp);
            /* if some reduced costs violates (slightly) their zero
             bounds (i.e. have wrong signs) due to round-off errors,
             dz also may have wrong sign being close to zero */
            if (T.mip.dir == GLP_MIN)
            {  if (dz < 0.0) dz = 0.0;
                info[k].deg = + dz;
            }
            else /* GLP_MAX */
            {  if (dz > 0.0) dz = 0.0;
                info[k].deg = - dz;
            }
        }
        else if (ret == 1)
        {  /* the constraint is not violated at the current point */
            info[k].eff = info[k].deg = 0.0;
        }
        else if (ret == 2)
        {  /* no dual feasible adjacent basis exists */
            info[k].eff = 1.0;
            info[k].deg = DBL_MAX;
        }
        else
            xassert(ret != ret);
        /* if the degradation is too small, just ignore it */
        if (info[k].deg < 0.01) info[k].deg = 0.0;
    }
    /* sort the list of cuts by decreasing objective degradation and
     then by decreasing efficacy */



    xqsort(info, 1, pool.size,
        function(info1, info2){
            if (info1.deg == 0.0 && info2.deg == 0.0)
            {  if (info1.eff > info2.eff) return -1;
                if (info1.eff < info2.eff) return +1;
            }
            else
            {  if (info1.deg > info2.deg) return -1;
                if (info1.deg < info2.deg) return +1;
            }
            return 0;
        }
    );
    /* only first (most efficient) max_cuts in the list are qualified
     as candidates to be added to the current subproblem */
    max_cuts = (T.curr.level == 0 ? 90 : 10);
    if (max_cuts > pool.size) max_cuts = pool.size;
    /* add cuts to the current subproblem */
    for (k = 1; k <= max_cuts; k++)
    {  var i;
        /* if this cut seems to be inefficient, skip it */
        if (info[k].deg < 0.01 && info[k].eff < 0.01) continue;
        /* if the angle between this cut and every other cut included
         in the current subproblem is small, skip this cut */
        for (kk = 1; kk < k; kk++)
        {  if (info[kk].flag)
        {  if (parallel(info[k].cut, info[kk].cut, work) > 0.90)
            break;
        }
        }
        if (kk < k) continue;
        /* add this cut to the current subproblem */
        cut = info[k].cut; info[k].flag = 1;
        i = glp_add_rows(T.mip, 1);
        if (cut.name != null)
            glp_set_row_name(T.mip, i, cut.name);
        xassert(T.mip.row[i].origin == GLP_RF_CUT);
        T.mip.row[i].klass = cut.klass;
        len = 0;
        for (aij = cut.ptr; aij != null; aij = aij.next){
            len++; ind[len] = aij.j; val[len] = aij.val;
        }
        glp_set_mat_row(T.mip, i, len, ind, val);
        xassert(cut.type == GLP_LO || cut.type == GLP_UP);
        glp_set_row_bnds(T.mip, i, cut.type, cut.rhs, cut.rhs);
    }
}

function ios_choose_node(T){
    function most_feas(T){
        /* select subproblem whose parent has minimal sum of integer
         infeasibilities */
        var node;
        var p;
        var best;
        p = 0; best = DBL_MAX;
        for (node = T.head; node != null; node = node.next)
        {  xassert(node.up != null);
            if (best > node.up.ii_sum){
                p = node.p; best = node.up.ii_sum;
            }
        }
        return p;
    }

    function best_proj(T){
        /* select subproblem using the best projection heuristic */
        var root, node;
        var p;
        var best, deg, obj;
        /* the global bound must exist */
        xassert(T.mip.mip_stat == GLP_FEAS);
        /* obtain pointer to the root node, which must exist */
        root = T.slot[1].node;
        xassert(root != null);
        /* deg estimates degradation of the objective function per unit
         of the sum of integer infeasibilities */
        xassert(root.ii_sum > 0.0);
        deg = (T.mip.mip_obj - root.bound) / root.ii_sum;
        /* nothing has been selected so far */
        p = 0; best = DBL_MAX;
        /* walk through the list of active subproblems */
        for (node = T.head; node != null; node = node.next)
        {  xassert(node.up != null);
            /* obj estimates optimal objective value if the sum of integer
             infeasibilities were zero */
            obj = node.up.bound + deg * node.up.ii_sum;
            if (T.mip.dir == GLP_MAX) obj = - obj;
            /* select the subproblem which has the best estimated optimal
             objective value */
            if (best > obj){p = node.p; best = obj}
        }
        return p;
    }

    function best_node(T){
        /* select subproblem with best local bound */
        var node, best = null;
        var bound, eps;
        switch (T.mip.dir)
        {  case GLP_MIN:
            bound = +DBL_MAX;
            for (node = T.head; node != null; node = node.next)
                if (bound > node.bound) bound = node.bound;
            xassert(bound != +DBL_MAX);
            eps = 0.001 * (1.0 + Math.abs(bound));
            for (node = T.head; node != null; node = node.next)
            {  if (node.bound <= bound + eps)
            {  xassert(node.up != null);
                if (best == null ||
                    best.up.ii_sum > node.up.ii_sum) best = node;
            }
            }
            break;
            case GLP_MAX:
                bound = -DBL_MAX;
                for (node = T.head; node != null; node = node.next)
                    if (bound < node.bound) bound = node.bound;
                xassert(bound != -DBL_MAX);
                eps = 0.001 * (1.0 + Math.abs(bound));
                for (node = T.head; node != null; node = node.next)
                {  if (node.bound >= bound - eps)
                {  xassert(node.up != null);
                    if (best == null ||
                        best.lp_obj < node.lp_obj) best = node;
                }
                }
                break;
            default:
                xassert(T != T);
        }
        xassert(best != null);
        return best.p;
    }

    var p;
    if (T.parm.bt_tech == GLP_BT_DFS)
    {  /* depth first search */
        xassert(T.tail != null);
        p = T.tail.p;
    }
    else if (T.parm.bt_tech == GLP_BT_BFS)
    {  /* breadth first search */
        xassert(T.head != null);
        p = T.head.p;
    }
    else if (T.parm.bt_tech == GLP_BT_BLB)
    {  /* select node with best local bound */
        p = best_node(T);
    }
    else if (T.parm.bt_tech == GLP_BT_BPH)
    {  if (T.mip.mip_stat == GLP_UNDEF)
    {  /* "most integer feasible" subproblem */
        p = most_feas(T);
    }
    else
    {  /* best projection heuristic */
        p = best_proj(T);
    }
    }
    else
        xassert(T != T);
    return p;
}

/* library version numbers: */
const
    GLP_MAJOR_VERSION = exports.GLP_MAJOR_VERSION = 4,
    GLP_MINOR_VERSION = exports.GLP_MINOR_VERSION = 47,

/* optimization direction flag: */
    GLP_MIN = exports.GLP_MIN = 1, /* minimization */
    GLP_MAX = exports.GLP_MAX = 2, /* maximization */

/* kind of structural variable: */
    GLP_CV = exports.GLP_CV = 1, /* continuous variable */
    GLP_IV = exports.GLP_IV = 2, /* integer variable */
    GLP_BV = exports.GLP_BV = 3, /* binary variable */

/* type of auxiliary/structural variable: */
    GLP_FR = exports.GLP_FR = exports.GLP_FR = 1, /* free variable */
    GLP_LO = exports.GLP_LO = exports.GLP_LO = 2, /* variable with lower bound */
    GLP_UP = exports.GLP_UP = exports.GLP_UP = 3, /* variable with upper bound */
    GLP_DB = exports.GLP_DB = exports.GLP_DB = 4, /* double-bounded variable */
    GLP_FX = exports.GLP_FX = exports.GLP_FX = 5, /* fixed variable */

/* status of auxiliary/structural variable: */
    GLP_BS = exports.GLP_BS = 1, /* basic variable */
    GLP_NL = exports.GLP_NL = 2, /* non-basic variable on lower bound */
    GLP_NU = exports.GLP_NU = 3, /* non-basic variable on upper bound */
    GLP_NF = exports.GLP_NF = 4, /* non-basic free variable */
    GLP_NS = exports.GLP_NS = 5, /* non-basic fixed variable */

/* scaling options: */
    GLP_SF_GM = exports.GLP_SF_GM = 0x01, /* perform geometric mean scaling */
    GLP_SF_EQ = exports.GLP_SF_EQ = 0x10, /* perform equilibration scaling */
    GLP_SF_2N = exports.GLP_SF_2N = 0x20, /* round scale factors to power of two */
    GLP_SF_SKIP = exports.GLP_SF_SKIP = 0x40, /* skip if problem is well scaled */
    GLP_SF_AUTO = exports.GLP_SF_AUTO = 0x80, /* choose scaling options automatically */

/* solution indicator: */
    GLP_SOL = exports.GLP_SOL = 1, /* basic solution */
    GLP_IPT = exports.GLP_IPT = 2, /* interior-point solution */
    GLP_MIP = exports.GLP_MIP = 3, /* mixed integer solution */

/* solution status: */
    GLP_UNDEF = exports.GLP_UNDEF = 1, /* solution is undefined */
    GLP_FEAS = exports.GLP_FEAS = 2, /* solution is feasible */
    GLP_INFEAS = exports.GLP_INFEAS = 3, /* solution is infeasible */
    GLP_NOFEAS = exports.GLP_NOFEAS = 4, /* no feasible solution exists */
    GLP_OPT = exports.GLP_OPT = 5, /* solution is optimal */
    GLP_UNBND = exports.GLP_UNBND = 6, /* solution is unbounded */

/* basis factorization control parameters */
    GLP_BF_FT = exports.GLP_BF_FT = 1, /* LUF + Forrest-Tomlin */
    GLP_BF_BG = exports.GLP_BF_BG = 2, /* LUF + Schur compl. + Bartels-Golub */
    GLP_BF_GR = exports.GLP_BF_GR = 3, /* LUF + Schur compl. + Givens rotation */

/* simplex method control parameters */
    GLP_MSG_OFF = exports.GLP_MSG_OFF = 0, /* no output */
    GLP_MSG_ERR = exports.GLP_MSG_ERR = 1, /* warning and error messages only */
    GLP_MSG_ON = exports.GLP_MSG_ON = 2, /* normal output */
    GLP_MSG_ALL = exports.GLP_MSG_ALL = 3, /* full output */
    GLP_MSG_DBG = exports.GLP_MSG_DBG = 4, /* debug output */

    GLP_PRIMAL = exports.GLP_PRIMAL = 1, /* use primal simplex */
    GLP_DUALP = exports.GLP_DUALP = 2, /* use dual; if it fails, use primal */
    GLP_DUAL = exports.GLP_DUAL = 3, /* use dual simplex */

    GLP_PT_STD = exports.GLP_PT_STD = 0x11, /* standard (Dantzig rule) */
    GLP_PT_PSE = exports.GLP_PT_PSE = 0x22, /* projected steepest edge */

    GLP_RT_STD = exports.GLP_RT_STD = 0x11, /* standard (textbook) */
    GLP_RT_HAR = exports.GLP_RT_HAR = 0x22, /* two-pass Harris' ratio test */

/* interior-point solver control parameters */
    GLP_ORD_NONE = exports.GLP_ORD_NONE = 0, /* natural (original) ordering */
    GLP_ORD_QMD = exports.GLP_ORD_QMD = 1, /* quotient minimum degree (QMD) */
    GLP_ORD_AMD = exports.GLP_ORD_AMD = 2, /* approx. minimum degree (AMD) */
    GLP_ORD_SYMAMD = exports.GLP_ORD_SYMAMD = 3, /* approx. minimum degree (SYMAMD) */

/* integer optimizer control parameters */
    GLP_BR_FFV = exports.GLP_BR_FFV = 1, /* first fractional variable */
    GLP_BR_LFV = exports.GLP_BR_LFV = 2, /* last fractional variable */
    GLP_BR_MFV = exports.GLP_BR_MFV = 3, /* most fractional variable */
    GLP_BR_DTH = exports.GLP_BR_DTH = 4, /* heuristic by Driebeck and Tomlin */
    GLP_BR_PCH = exports.GLP_BR_PCH = 5, /* hybrid pseudocost heuristic */

    GLP_BT_DFS = exports.GLP_BT_DFS = 1, /* depth first search */
    GLP_BT_BFS = exports.GLP_BT_BFS = 2, /* breadth first search */
    GLP_BT_BLB = exports.GLP_BT_BLB = 3, /* best local bound */
    GLP_BT_BPH = exports.GLP_BT_BPH = 4, /* best projection heuristic */

    GLP_PP_NONE = exports.GLP_PP_NONE = 0, /* disable preprocessing */
    GLP_PP_ROOT = exports.GLP_PP_ROOT = 1, /* preprocessing only on root level */
    GLP_PP_ALL = exports.GLP_PP_ALL = 2, /* preprocessing on all levels */

/* additional row attributes */
    GLP_RF_REG = exports.GLP_RF_REG = 0, /* regular constraint */
    GLP_RF_LAZY = exports.GLP_RF_LAZY = 1, /* "lazy" constraint */
    GLP_RF_CUT = exports.GLP_RF_CUT = 2, /* cutting plane constraint */

/* row class descriptor: */
    GLP_RF_GMI = exports.GLP_RF_GMI = 1, /* Gomory's mixed integer cut */
    GLP_RF_MIR = exports.GLP_RF_MIR = 2, /* mixed integer rounding cut */
    GLP_RF_COV = exports.GLP_RF_COV = 3, /* mixed cover cut */
    GLP_RF_CLQ = exports.GLP_RF_CLQ = 4, /* clique cut */

/* enable/disable flag: */
    GLP_ON = exports.GLP_ON = 1, /* enable something */
    GLP_OFF = exports.GLP_OFF = 0, /* disable something */

/* reason codes: */
    GLP_IROWGEN = exports.GLP_IROWGEN = 0x01, /* request for row generation */
    GLP_IBINGO = exports.GLP_IBINGO = 0x02, /* better integer solution found */
    GLP_IHEUR = exports.GLP_IHEUR = 0x03, /* request for heuristic solution */
    GLP_ICUTGEN = exports.GLP_ICUTGEN = 0x04, /* request for cut generation */
    GLP_IBRANCH = exports.GLP_IBRANCH = 0x05, /* request for branching */
    GLP_ISELECT = exports.GLP_ISELECT = 0x06, /* request for subproblem selection */
    GLP_IPREPRO = exports.GLP_IPREPRO = 0x07, /* request for preprocessing */

/* branch selection indicator: */
    GLP_NO_BRNCH = exports.GLP_NO_BRNCH = 0, /* select no branch */
    GLP_DN_BRNCH = exports.GLP_DN_BRNCH = 1, /* select down-branch */
    GLP_UP_BRNCH = exports.GLP_UP_BRNCH = 2, /* select up-branch */

/* return codes: */
    GLP_EBADB = exports.GLP_EBADB = 0x01, /* invalid basis */
    GLP_ESING = exports.GLP_ESING = 0x02, /* singular matrix */
    GLP_ECOND = exports.GLP_ECOND = 0x03, /* ill-conditioned matrix */
    GLP_EBOUND = exports.GLP_EBOUND = 0x04, /* invalid bounds */
    GLP_EFAIL = exports.GLP_EFAIL = 0x05, /* solver failed */
    GLP_EOBJLL = exports.GLP_EOBJLL = 0x06, /* objective lower limit reached */
    GLP_EOBJUL = exports.GLP_EOBJUL = 0x07, /* objective upper limit reached */
    GLP_EITLIM = exports.GLP_EITLIM = 0x08, /* iteration limit exceeded */
    GLP_ETMLIM = exports.GLP_ETMLIM = 0x09, /* time limit exceeded */
    GLP_ENOPFS = exports.GLP_ENOPFS = 0x0A, /* no primal feasible solution */
    GLP_ENODFS = exports.GLP_ENODFS = 0x0B, /* no dual feasible solution */
    GLP_EROOT = exports.GLP_EROOT = 0x0C, /* root LP optimum not provided */
    GLP_ESTOP = exports.GLP_ESTOP = 0x0D, /* search terminated by application */
    GLP_EMIPGAP = exports.GLP_EMIPGAP = 0x0E, /* relative mip gap tolerance reached */
    GLP_ENOFEAS = exports.GLP_ENOFEAS = 0x0F, /* no primal/dual feasible solution */
    GLP_ENOCVG = exports.GLP_ENOCVG = 0x10, /* no convergence */
    GLP_EINSTAB = exports.GLP_EINSTAB = 0x11, /* numerical instability */
    GLP_EDATA = exports.GLP_EDATA = 0x12, /* invalid data */
    GLP_ERANGE = exports.GLP_ERANGE = 0x13, /* result out of range */

/* condition indicator: */
    GLP_KKT_PE = exports.GLP_KKT_PE = 1, /* primal equalities */
    GLP_KKT_PB = exports.GLP_KKT_PB = 2, /* primal bounds */
    GLP_KKT_DE = exports.GLP_KKT_DE = 3, /* dual equalities */
    GLP_KKT_DB = exports.GLP_KKT_DB = 4, /* dual bounds */
    GLP_KKT_CS = exports.GLP_KKT_CS = 5, /* complementary slackness */

/* MPS file format: */
    GLP_MPS_DECK = exports.GLP_MPS_DECK = 1, /* fixed (ancient) */
    GLP_MPS_FILE = exports.GLP_MPS_FILE = 2, /* free (modern) */

/* assignment problem formulation: */
    GLP_ASN_MIN = exports.GLP_ASN_MIN = 1, /* perfect matching (minimization) */
    GLP_ASN_MAX = exports.GLP_ASN_MAX = 2, /* perfect matching (maximization) */
    GLP_ASN_MMP = exports.GLP_ASN_MMP = 3, /* maximum matching */

/* problem class: */
    LPX_LP = exports.LPX_LP = 100, /* linear programming (LP) */
    LPX_MIP = exports.LPX_MIP = 101, /* mixed integer programming (MIP) */

/* type of auxiliary/structural variable: */
    LPX_FR = exports.LPX_FR = 110, /* free variable */
    LPX_LO = exports.LPX_LO = 111, /* variable with lower bound */
    LPX_UP = exports.LPX_UP = 112, /* variable with upper bound */
    LPX_DB = exports.LPX_DB = 113, /* double-bounded variable */
    LPX_FX = exports.LPX_FX = 114, /* fixed variable */

/* optimization direction flag: */
    LPX_MIN = exports.LPX_MIN = 120, /* minimization */
    LPX_MAX = exports.LPX_MAX = 121, /* maximization */

/* status of primal basic solution: */
    LPX_P_UNDEF = exports.LPX_P_UNDEF = 132, /* primal solution is undefined */
    LPX_P_FEAS = exports.LPX_P_FEAS = 133, /* solution is primal feasible */
    LPX_P_INFEAS = exports.LPX_P_INFEAS = 134, /* solution is primal infeasible */
    LPX_P_NOFEAS = exports.LPX_P_NOFEAS = 135, /* no primal feasible solution exists */

/* status of dual basic solution: */
    LPX_D_UNDEF = exports.LPX_D_UNDEF = 136, /* dual solution is undefined */
    LPX_D_FEAS = exports.LPX_D_FEAS = 137, /* solution is dual feasible */
    LPX_D_INFEAS = exports.LPX_D_INFEAS = 138, /* solution is dual infeasible */
    LPX_D_NOFEAS = exports.LPX_D_NOFEAS = 139, /* no dual feasible solution exists */

/* status of auxiliary/structural variable: */
    LPX_BS = exports.LPX_BS = 140, /* basic variable */
    LPX_NL = exports.LPX_NL = 141, /* non-basic variable on lower bound */
    LPX_NU = exports.LPX_NU = 142, /* non-basic variable on upper bound */
    LPX_NF = exports.LPX_NF = 143, /* non-basic free variable */
    LPX_NS = exports.LPX_NS = 144, /* non-basic fixed variable */

/* status of interior-point solution: */
    LPX_T_UNDEF = exports.LPX_T_UNDEF = 150, /* interior solution is undefined */
    LPX_T_OPT = exports.LPX_T_OPT = 151, /* interior solution is optimal */

/* kind of structural variable: */
    LPX_CV = exports.LPX_CV = 160, /* continuous variable */
    LPX_IV = exports.LPX_IV = 161, /* integer variable */

/* status of integer solution: */
    LPX_I_UNDEF = exports.LPX_I_UNDEF = 170, /* integer solution is undefined */
    LPX_I_OPT = exports.LPX_I_OPT = 171, /* integer solution is optimal */
    LPX_I_FEAS = exports.LPX_I_FEAS = 172, /* integer solution is feasible */
    LPX_I_NOFEAS = exports.LPX_I_NOFEAS = 173, /* no integer solution exists */

/* status codes reported by the routine lpx_get_status: */
    LPX_OPT = exports.LPX_OPT = 180, /* optimal */
    LPX_FEAS = exports.LPX_FEAS = 181, /* feasible */
    LPX_INFEAS = exports.LPX_INFEAS = 182, /* infeasible */
    LPX_NOFEAS = exports.LPX_NOFEAS = 183, /* no feasible */
    LPX_UNBND = exports.LPX_UNBND = 184, /* unbounded */
    LPX_UNDEF = exports.LPX_UNDEF = 185, /* undefined */

/* exit codes returned by solver routines: */
    LPX_E_OK = exports.LPX_E_OK = 200, /* success */
    LPX_E_EMPTY = exports.LPX_E_EMPTY = 201, /* empty problem */
    LPX_E_BADB = exports.LPX_E_BADB = 202, /* invalid initial basis */
    LPX_E_INFEAS = exports.LPX_E_INFEAS = 203, /* infeasible initial solution */
    LPX_E_FAULT = exports.LPX_E_FAULT = 204, /* unable to start the search */
    LPX_E_OBJLL = exports.LPX_E_OBJLL = 205, /* objective lower limit reached */
    LPX_E_OBJUL = exports.LPX_E_OBJUL = 206, /* objective upper limit reached */
    LPX_E_ITLIM = exports.LPX_E_ITLIM = 207, /* iterations limit exhausted */
    LPX_E_TMLIM = exports.LPX_E_TMLIM = 208, /* time limit exhausted */
    LPX_E_NOFEAS = exports.LPX_E_NOFEAS = 209, /* no feasible solution */
    LPX_E_INSTAB = exports.LPX_E_INSTAB = 210, /* numerical instability */
    LPX_E_SING = exports.LPX_E_SING = 211, /* problems with basis matrix */
    LPX_E_NOCONV = exports.LPX_E_NOCONV = 212, /* no convergence (interior) */
    LPX_E_NOPFS = exports.LPX_E_NOPFS = 213, /* no primal feas. sol. (LP presolver) */
    LPX_E_NODFS = exports.LPX_E_NODFS = 214, /* no dual feas. sol. (LP presolver) */
    LPX_E_MIPGAP = exports.LPX_E_MIPGAP = 215, /* relative mip gap tolerance reached */

/* control parameter identifiers: */
    LPX_K_MSGLEV = exports.LPX_K_MSGLEV = 300, /* lp.msg_lev */
    LPX_K_SCALE = exports.LPX_K_SCALE = 301, /* lp.scale */
    LPX_K_DUAL = exports.LPX_K_DUAL = 302, /* lp.dual */
    LPX_K_PRICE = exports.LPX_K_PRICE = 303, /* lp.price */
    LPX_K_RELAX = exports.LPX_K_RELAX = 304, /* lp.relax */
    LPX_K_TOLBND = exports.LPX_K_TOLBND = 305, /* lp.tol_bnd */
    LPX_K_TOLDJ = exports.LPX_K_TOLDJ = 306, /* lp.tol_dj */
    LPX_K_TOLPIV = exports.LPX_K_TOLPIV = 307, /* lp.tol_piv */
    LPX_K_ROUND = exports.LPX_K_ROUND = 308, /* lp.round */
    LPX_K_OBJLL = exports.LPX_K_OBJLL = 309, /* lp.obj_ll */
    LPX_K_OBJUL = exports.LPX_K_OBJUL = 310, /* lp.obj_ul */
    LPX_K_ITLIM = exports.LPX_K_ITLIM = 311, /* lp.it_lim */
    LPX_K_ITCNT = exports.LPX_K_ITCNT = 312, /* lp.it_cnt */
    LPX_K_TMLIM = exports.LPX_K_TMLIM = 313, /* lp.tm_lim */
    LPX_K_OUTFRQ = exports.LPX_K_OUTFRQ = 314, /* lp.out_frq */
    LPX_K_OUTDLY = exports.LPX_K_OUTDLY = 315, /* lp.out_dly */
    LPX_K_BRANCH = exports.LPX_K_BRANCH = 316, /* lp.branch */
    LPX_K_BTRACK = exports.LPX_K_BTRACK = 317, /* lp.btrack */
    LPX_K_TOLINT = exports.LPX_K_TOLINT = 318, /* lp.tol_int */
    LPX_K_TOLOBJ = exports.LPX_K_TOLOBJ = 319, /* lp.tol_obj */
    LPX_K_MPSINFO = exports.LPX_K_MPSINFO = 320, /* lp.mps_info */
    LPX_K_MPSOBJ = exports.LPX_K_MPSOBJ = 321, /* lp.mps_obj */
    LPX_K_MPSORIG = exports.LPX_K_MPSORIG = 322, /* lp.mps_orig */
    LPX_K_MPSWIDE = exports.LPX_K_MPSWIDE = 323, /* lp.mps_wide */
    LPX_K_MPSFREE = exports.LPX_K_MPSFREE = 324, /* lp.mps_free */
    LPX_K_MPSSKIP = exports.LPX_K_MPSSKIP = 325, /* lp.mps_skip */
    LPX_K_LPTORIG = exports.LPX_K_LPTORIG = 326, /* lp.lpt_orig */
    LPX_K_PRESOL = exports.LPX_K_PRESOL = 327, /* lp.presol */
    LPX_K_BINARIZE = exports.LPX_K_BINARIZE = 328, /* lp.binarize */
    LPX_K_USECUTS = exports.LPX_K_USECUTS = 329, /* lp.use_cuts */
    LPX_K_BFTYPE = exports.LPX_K_BFTYPE = 330, /* lp.bfcp.type */
    LPX_K_MIPGAP = exports.LPX_K_MIPGAP = 331, /* lp.mip_gap */

    LPX_C_COVER = exports.LPX_C_COVER = 0x01, /* mixed cover cuts */
    LPX_C_CLIQUE = exports.LPX_C_CLIQUE = 0x02, /* clique cuts */
    LPX_C_GOMORY = exports.LPX_C_GOMORY = 0x04, /* Gomory's mixed integer cuts */
    LPX_C_MIR = exports.LPX_C_MIR = 0x08, /* mixed integer rounding cuts */
    LPX_C_ALL = exports.LPX_C_ALL = 0xFF;

function gcd(x, y){
    var r;
    xassert(x > 0 && y > 0);
    while (y > 0){
        r = x % y;
        x = y;
        y = r;
    }
    return x;
}

function gcdn(n, x){
    var d = 0, j;
    xassert(n > 0);
    for (j = 1; j <= n; j++)
    {  xassert(x[j] > 0);
        if (j == 1)
            d = x[1];
        else
            d = gcd(d, x[j]);
        if (d == 1) break;
    }
    return d;
}

function round2n(x){
    xassert(x > 0.0);
    var e = Math.floor(Math.log(x) / Math.log(2)) + 1;
    var f = x / Math.pow(2, e);
    return Math.pow(2, f <= 0.75 ? e-1 : e);
}

/* return codes: */
const
    LPF_ESING    = 1;  /* singular matrix */
    LPF_ECOND    = 2;  /* ill-conditioned matrix */
    LPF_ELIMIT   = 3;  /* update limit reached */


const _GLPLPF_DEBUG = 0;

function lpf_create_it(){
    var lpf;
    if (_GLPLPF_DEBUG){
        xprintf("lpf_create_it: warning: debug mode enabled");
    }
    lpf = {};
    lpf.valid = 0;
    lpf.m0_max = lpf.m0 = 0;
    lpf.luf = luf_create_it();
    lpf.m = 0;
    lpf.B = null;
    lpf.n_max = 50;
    lpf.n = 0;
    lpf.R_ptr = lpf.R_len = null;
    lpf.S_ptr = lpf.S_len = null;
    lpf.scf = null;
    lpf.P_row = lpf.P_col = null;
    lpf.Q_row = lpf.Q_col = null;
    lpf.v_size = 1000;
    lpf.v_ptr = 0;
    lpf.v_ind = null;
    lpf.v_val = null;
    lpf.work1 = lpf.work2 = null;
    return lpf;
}

function lpf_factorize(lpf, m, bh, col, info){
    var k, ret;
    if (_GLPLPF_DEBUG){
        var i, j, len, ind;
        var B, val;
    }
    xassert(bh == bh);
    if (m < 1)
        xerror("lpf_factorize: m = " + m + "; invalid parameter");
    if (m > M_MAX)
        xerror("lpf_factorize: m = " + m + "; matrix too big");
    lpf.m0 = lpf.m = m;
    /* invalidate the factorization */
    lpf.valid = 0;
    /* allocate/reallocate arrays, if necessary */
    if (lpf.R_ptr == null)
        lpf.R_ptr = new Array(1+lpf.n_max);
    if (lpf.R_len == null)
        lpf.R_len = new Array(1+lpf.n_max);
    if (lpf.S_ptr == null)
        lpf.S_ptr = new Array(1+lpf.n_max);
    if (lpf.S_len == null)
        lpf.S_len = new Array(1+lpf.n_max);
    if (lpf.scf == null)
        lpf.scf = scf_create_it(lpf.n_max);
    if (lpf.v_ind == null)
        lpf.v_ind = new Array(1+lpf.v_size);
    if (lpf.v_val == null)
        lpf.v_val = new Array(1+lpf.v_size);
    if (lpf.m0_max < m)
    {
        lpf.m0_max = m + 100;
        lpf.P_row = new Array(1+lpf.m0_max+lpf.n_max);
        lpf.P_col = new Array(1+lpf.m0_max+lpf.n_max);
        lpf.Q_row = new Array(1+lpf.m0_max+lpf.n_max);
        lpf.Q_col = new Array(1+lpf.m0_max+lpf.n_max);
        lpf.work1 = new Array(1+lpf.m0_max+lpf.n_max);
        lpf.work2 = new Array(1+lpf.m0_max+lpf.n_max);
    }
    /* try to factorize the basis matrix */
    switch (luf_factorize(lpf.luf, m, col, info))
    {  case 0:
        break;
        case LUF_ESING:
            ret = LPF_ESING;
            return ret;
        case LUF_ECOND:
            ret = LPF_ECOND;
            return ret;
        default:
            xassert(lpf != lpf);
    }
    /* the basis matrix has been successfully factorized */
    lpf.valid = 1;
    if (_GLPLPF_DEBUG){
        /* store the basis matrix for debugging */
        xassert(m <= 32767);
        lpf.B = B = new Array(1+m*m);
        ind = new Array(1+m);
        val = new Array(1+m);
        for (k = 1; k <= m * m; k++)
            B[k] = 0.0;
        for (j = 1; j <= m; j++)
        {  len = col(info, j, ind, val);
            xassert(0 <= len && len <= m);
            for (k = 1; k <= len; k++)
            {  i = ind[k];
                xassert(1 <= i && i <= m);
                xassert(B[(i - 1) * m + j] == 0.0);
                xassert(val[k] != 0.0);
                B[(i - 1) * m + j] = val[k];
            }
        }
    }
    /* B = B0, so there are no additional rows/columns */
    lpf.n = 0;
    /* reset the Schur complement factorization */
    scf_reset_it(lpf.scf);
    /* P := Q := I */
    for (k = 1; k <= m; k++)
    {  lpf.P_row[k] = lpf.P_col[k] = k;
        lpf.Q_row[k] = lpf.Q_col[k] = k;
    }
    /* make all SVA locations free */
    lpf.v_ptr = 1;
    ret = 0;
    /* return to the calling program */
    return ret;
}

function r_prod(lpf, y, a, x, idx){
    var n = lpf.n;
    var R_ptr = lpf.R_ptr;
    var R_len = lpf.R_len;
    var v_ind = lpf.v_ind;
    var v_val = lpf.v_val;
    var j, beg, end, ptr;
    var t;
    for (j = 1; j <= n; j++)
    {  if (x[j+idx] == 0.0) continue;
        /* y := y + alpha * R[j] * x[j] */
        t = a * x[j+idx];
        beg = R_ptr[j];
        end = beg + R_len[j];
        for (ptr = beg; ptr < end; ptr++)
            y[v_ind[ptr]] += t * v_val[ptr];
    }
}

function rt_prod(lpf, y, idx, a, x){
    var n = lpf.n;
    var R_ptr = lpf.R_ptr;
    var R_len = lpf.R_len;
    var v_ind = lpf.v_ind;
    var v_val = lpf.v_val;
    var j, beg, end, ptr;
    var t;
    for (j = 1; j <= n; j++)
    {  /* t := (j-th column of R) * x */
        t = 0.0;
        beg = R_ptr[j];
        end = beg + R_len[j];
        for (ptr = beg; ptr < end; ptr++)
            t += v_val[ptr] * x[v_ind[ptr]];
        /* y[j] := y[j] + alpha * t */
        y[j+idx] += a * t;
    }
}

function s_prod(lpf, y, idx, a, x){
    var n = lpf.n;
    var S_ptr = lpf.S_ptr;
    var S_len = lpf.S_len;
    var v_ind = lpf.v_ind;
    var v_val = lpf.v_val;
    var i, beg, end, ptr;
    var t;
    for (i = 1; i <= n; i++)
    {  /* t := (i-th row of S) * x */
        t = 0.0;
        beg = S_ptr[i];
        end = beg + S_len[i];
        for (ptr = beg; ptr < end; ptr++)
            t += v_val[ptr] * x[v_ind[ptr]];
        /* y[i] := y[i] + alpha * t */
        y[i+idx] += a * t;
    }
}

function st_prod(lpf, y, a, x, idx){
    var n = lpf.n;
    var S_ptr = lpf.S_ptr;
    var S_len = lpf.S_len;
    var v_ind = lpf.v_ind;
    var v_val = lpf.v_val;
    var i, beg, end, ptr;
    var t;
    for (i = 1; i <= n; i++)
    {  if (x[i+idx] == 0.0) continue;
        /* y := y + alpha * S'[i] * x[i] */
        t = a * x[i+idx];
        beg = S_ptr[i];
        end = beg + S_len[i];
        for (ptr = beg; ptr < end; ptr++)
            y[v_ind[ptr]] += t * v_val[ptr];
    }
}

if (_GLPLPF_DEBUG){
    /***********************************************************************
     *  The routine check_error computes the maximal relative error between
     *  left- and right-hand sides for the system B * x = b (if tr is zero)
     *  or B' * x = b (if tr is non-zero), where B' is a matrix transposed
     *  to B. (This routine is intended for debugging only.) */

    function check_error(lpf, tr, x, b){
        var m = lpf.m;
        var B = lpf.B;
        var i, j;
        var d, dmax = 0.0, s, t, tmax;
        for (i = 1; i <= m; i++)
        {  s = 0.0;
            tmax = 1.0;
            for (j = 1; j <= m; j++)
            {  if (!tr)
                t = B[m * (i - 1) + j] * x[j];
            else
                t = B[m * (j - 1) + i] * x[j];
                if (tmax < Math.abs(t)) tmax = Math.abs(t);
                s += t;
            }
            d = Math.abs(s - b[i]) / tmax;
            if (dmax < d) dmax = d;
        }
        if (dmax > 1e-8)
            xprintf((!tr ? "lpf_ftran" : "lpf_btran") + ": dmax = " + dmax + "; relative error too large");
    }
}

function lpf_ftran(lpf, x){
    var m0 = lpf.m0;
    var m = lpf.m;
    var n  = lpf.n;
    var P_col = lpf.P_col;
    var Q_col = lpf.Q_col;
    var fg = lpf.work1;
    var f = fg;
    var g = fg;
    var i, ii;
    if (_GLPLPF_DEBUG){var b}
    if (!lpf.valid)
        xerror("lpf_ftran: the factorization is not valid");
    xassert(0 <= m && m <= m0 + n);
    if (_GLPLPF_DEBUG){
        /* save the right-hand side vector */
        b = new Array(1+m);
        for (i = 1; i <= m; i++) b[i] = x[i];
    }
    /* (f g) := inv(P) * (b 0) */
    for (i = 1; i <= m0 + n; i++)
        fg[i] = ((ii = P_col[i]) <= m ? x[ii] : 0.0);
    /* f1 := inv(L0) * f */
    luf_f_solve(lpf.luf, 0, f);
    /* g1 := g - S * f1 */
    s_prod(lpf, g, m0, -1.0, f);
    /* g2 := inv(C) * g1 */
    scf_solve_it(lpf.scf, 0, g, m0);
    /* f2 := inv(U0) * (f1 - R * g2) */
    r_prod(lpf, f, -1.0, g, m0);
    luf_v_solve(lpf.luf, 0, f);
    /* (x y) := inv(Q) * (f2 g2) */
    for (i = 1; i <= m; i++)
        x[i] = fg[Q_col[i]];
    if (_GLPLPF_DEBUG){
        /* check relative error in solution */
        check_error(lpf, 0, x, b);
    }
}

function lpf_btran(lpf, x){
    var m0 = lpf.m0;
    var m = lpf.m;
    var n = lpf.n;
    var P_row = lpf.P_row;
    var Q_row = lpf.Q_row;
    var fg = lpf.work1;
    var f = fg;
    var g = fg;
    var i, ii;
    if (_GLPLPF_DEBUG){var b}
    if (!lpf.valid)
        xerror("lpf_btran: the factorization is not valid");
    xassert(0 <= m && m <= m0 + n);
    if (_GLPLPF_DEBUG){
        /* save the right-hand side vector */
        b = new Array(1+m);
        for (i = 1; i <= m; i++) b[i] = x[i];
    }
    /* (f g) := Q * (b 0) */
    for (i = 1; i <= m0 + n; i++)
        fg[i] = ((ii = Q_row[i]) <= m ? x[ii] : 0.0);
    /* f1 := inv(U'0) * f */
    luf_v_solve(lpf.luf, 1, f);
    /* g1 := inv(C') * (g - R' * f1) */
    rt_prod(lpf, g, m0, -1.0, f);
    scf_solve_it(lpf.scf, 1, g, m0);
    /* g2 := g1 */
    //g = g;
    /* f2 := inv(L'0) * (f1 - S' * g2) */
    st_prod(lpf, f, -1.0, g, m0);
    luf_f_solve(lpf.luf, 1, f);
    /* (x y) := P * (f2 g2) */
    for (i = 1; i <= m; i++)
        x[i] = fg[P_row[i]];
    if (_GLPLPF_DEBUG){
        /* check relative error in solution */
        check_error(lpf, 1, x, b);
    }
}

function enlarge_sva(lpf, new_size){
    var v_size = lpf.v_size;
    var used = lpf.v_ptr - 1;
    var v_ind = lpf.v_ind;
    var v_val = lpf.v_val;
    xassert(v_size < new_size);
    while (v_size < new_size) v_size += v_size;
    lpf.v_size = v_size;
    lpf.v_ind = new Array(1+v_size);
    lpf.v_val = new Array(1+v_size);
    xassert(used >= 0);
    xcopyArr(lpf.v_ind, 1, v_ind, 1, used);
    xcopyArr(lpf.v_val, 1, v_val, 1, used);
}

function lpf_update_it(lpf, j, bh, len, ind, idx, val){
    var m0 = lpf.m0;
    var m = lpf.m;
    if (_GLPLPF_DEBUG){var B = lpf.B}
    var n = lpf.n;
    var R_ptr = lpf.R_ptr;
    var R_len = lpf.R_len;
    var S_ptr = lpf.S_ptr;
    var S_len = lpf.S_len;
    var P_row = lpf.P_row;
    var P_col = lpf.P_col;
    var Q_row = lpf.Q_row;
    var Q_col = lpf.Q_col;
    var v_ptr = lpf.v_ptr;
    var v_ind = lpf.v_ind;
    var v_val = lpf.v_val;
    var a = lpf.work2; /* new column */
    var fg = lpf.work1, f = fg, g = fg;
    var vw = lpf.work2, v = vw, w = vw;
    var x = g, y = w, z;
    var i, ii, k, ret;
    xassert(bh == bh);
    if (!lpf.valid)
        xerror("lpf_update_it: the factorization is not valid");
    if (!(1 <= j && j <= m))
        xerror("lpf_update_it: j = " + j + "; column number out of range");
    xassert(0 <= m && m <= m0 + n);
    /* check if the basis factorization can be expanded */
    if (n == lpf.n_max)
    {  lpf.valid = 0;
        ret = LPF_ELIMIT;
        return ret;
    }
    /* convert new j-th column of B to dense format */
    for (i = 1; i <= m; i++)
        a[i] = 0.0;
    for (k = 1; k <= len; k++)
    {  i = ind[idx + k];
        if (!(1 <= i && i <= m))
            xerror("lpf_update_it: ind[" + k + "] = " + i + "; row number out of range");
        if (a[i] != 0.0)
            xerror("lpf_update_it: ind[" + k + "] = " + i + "; duplicate row index not allowed");
        if (val[k] == 0.0)
            xerror("lpf_update_it: val[" + k + "] = " + val[k] + "; zero element not allowed");
        a[i] = val[k];
    }
    if (_GLPLPF_DEBUG){
        /* change column in the basis matrix for debugging */
        for (i = 1; i <= m; i++)
            B[(i - 1) * m + j] = a[i];
    }
    /* (f g) := inv(P) * (a 0) */
    for (i = 1; i <= m0+n; i++)
        fg[i] = ((ii = P_col[i]) <= m ? a[ii] : 0.0);
    /* (v w) := Q * (ej 0) */
    for (i = 1; i <= m0+n; i++) vw[i] = 0.0;
    vw[Q_col[j]] = 1.0;
    /* f1 := inv(L0) * f (new column of R) */
    luf_f_solve(lpf.luf, 0, f);
    /* v1 := inv(U'0) * v (new row of S) */
    luf_v_solve(lpf.luf, 1, v);
    /* we need at most 2 * m0 available locations in the SVA to store
     new column of matrix R and new row of matrix S */
    if (lpf.v_size < v_ptr + m0 + m0)
    {  enlarge_sva(lpf, v_ptr + m0 + m0);
        v_ind = lpf.v_ind;
        v_val = lpf.v_val;
    }
    /* store new column of R */
    R_ptr[n+1] = v_ptr;
    for (i = 1; i <= m0; i++)
    {  if (f[i] != 0.0){
        v_ind[v_ptr] = i; v_val[v_ptr] = f[i]; v_ptr++;
    }

    }
    R_len[n+1] = v_ptr - lpf.v_ptr;
    lpf.v_ptr = v_ptr;
    /* store new row of S */
    S_ptr[n+1] = v_ptr;
    for (i = 1; i <= m0; i++)
    {  if (v[i] != 0.0){
        v_ind[v_ptr] = i; v_val[v_ptr] = v[i]; v_ptr++;
    }

    }
    S_len[n+1] = v_ptr - lpf.v_ptr;
    lpf.v_ptr = v_ptr;
    /* x := g - S * f1 (new column of C) */
    s_prod(lpf, x, 0, -1.0, f);
    /* y := w - R' * v1 (new row of C) */
    rt_prod(lpf, y, 0, -1.0, v);
    /* z := - v1 * f1 (new diagonal element of C) */
    z = 0.0;
    for (i = 1; i <= m0; i++) z -= v[i] * f[i];
    /* update factorization of new matrix C */
    switch (scf_update_exp(lpf.scf, x, m0, y, m0, z))
    {  case 0:
        break;
        case SCF_ESING:
            lpf.valid = 0;
            ret = LPF_ESING;
            return ret;
        case SCF_ELIMIT:
            xassert(lpf != lpf);
        default:
            xassert(lpf != lpf);
    }
    /* expand matrix P */
    P_row[m0+n+1] = P_col[m0+n+1] = m0+n+1;
    /* expand matrix Q */
    Q_row[m0+n+1] = Q_col[m0+n+1] = m0+n+1;
    /* permute j-th and last (just added) column of matrix Q */
    i = Q_col[j]; ii = Q_col[m0+n+1];
    Q_row[i] = m0+n+1; Q_col[m0+n+1] = i;
    Q_row[ii] = j; Q_col[j] = ii;
    /* increase the number of additional rows and columns */
    lpf.n++;
    xassert(lpf.n <= lpf.n_max);
    /* the factorization has been successfully updated */
    ret = 0;
    /* return to the calling program */
    return ret;
}

function lpx_create_prob(){
    /* create problem object */
    return glp_create_prob();
}

function lpx_set_prob_name(lp, name)
{     /* assign (change) problem name */
    glp_set_prob_name(lp, name);
}

function lpx_set_obj_name(lp, name){
    /* assign (change) objective function name */
    glp_set_obj_name(lp, name);
}

function lpx_set_obj_dir(lp, dir){
    /* set (change) optimization direction flag */
    glp_set_obj_dir(lp, dir - LPX_MIN + GLP_MIN);
}

function lpx_add_rows(lp, nrs){
    /* add new rows to problem object */
    return glp_add_rows(lp, nrs);
}

function lpx_add_cols(lp, ncs){
    /* add new columns to problem object */
    return glp_add_cols(lp, ncs);
}

function lpx_set_row_name(lp, i, name)
{     /* assign (change) row name */
    glp_set_row_name(lp, i, name);
}

function lpx_set_col_name(lp, j, name){
    /* assign (change) column name */
    glp_set_col_name(lp, j, name);
}

function lpx_set_row_bnds(lp, i, type, lb, ub){
    /* set (change) row bounds */
    glp_set_row_bnds(lp, i, type - LPX_FR + GLP_FR, lb, ub);
}

function lpx_set_col_bnds(lp, j, type, lb, ub){
    /* set (change) column bounds */
    glp_set_col_bnds(lp, j, type - LPX_FR + GLP_FR, lb, ub);
}

function lpx_set_obj_coef(lp, j, coef){
    /* set (change) obj. coefficient or constant term */
    glp_set_obj_coef(lp, j, coef);
}

function lpx_set_mat_row(lp, i, len, ind, val){
    /* set (replace) row of the constraint matrix */
    glp_set_mat_row(lp, i, len, ind, val);
}

function lpx_set_mat_col(lp, j, len, ind, val){
    /* set (replace) column of the constraint matrix */
    glp_set_mat_col(lp, j, len, ind, val);
}

function lpx_load_matrix(lp, ne, ia, ja, ar){
    /* load (replace) the whole constraint matrix */
    glp_load_matrix(lp, ne, ia, ja, ar);
}

function lpx_del_rows(lp, nrs, num){
    /* delete specified rows from problem object */
    glp_del_rows(lp, nrs, num);
}

function lpx_del_cols(lp, ncs, num){
    /* delete specified columns from problem object */
    glp_del_cols(lp, ncs, num);
}

function lpx_delete_prob(lp){
    /* delete problem object */
    glp_delete_prob(lp);
}

function lpx_get_prob_name(lp){
    /* retrieve problem name */
    return glp_get_prob_name(lp);
}

function lpx_get_obj_name(lp){
    /* retrieve objective function name */
    return glp_get_obj_name(lp);
}

function lpx_get_obj_dir(lp){
    /* retrieve optimization direction flag */
    return glp_get_obj_dir(lp) - GLP_MIN + LPX_MIN;
}

function lpx_get_num_rows(lp){
    /* retrieve number of rows */
    return glp_get_num_rows(lp);
}

function lpx_get_num_cols(lp){
    /* retrieve number of columns */
    return glp_get_num_cols(lp);
}

function lpx_get_row_name(lp, i){
    /* retrieve row name */
    return glp_get_row_name(lp, i);
}

function lpx_get_col_name(lp, j){
    /* retrieve column name */
    return glp_get_col_name(lp, j);
}

function lpx_get_row_type(lp, i){
    /* retrieve row type */
    return glp_get_row_type(lp, i) - GLP_FR + LPX_FR;
}

function lpx_get_row_lb(lp, i){
    /* retrieve row lower bound */
    var lb = glp_get_row_lb(lp, i);
    if (lb == -DBL_MAX) lb = 0.0;
    return lb;
}

function lpx_get_row_ub(lp, i){
    /* retrieve row upper bound */
    var ub = glp_get_row_ub(lp, i);
    if (ub == +DBL_MAX) ub = 0.0;
    return ub;
}

function lpx_get_row_bnds(lp, i, callback){
    /* retrieve row bounds */
    callback(lpx_get_row_type(lp, i), lpx_get_row_lb(lp, i), lpx_get_row_ub(lp, i));
}

function lpx_get_col_type(lp, j){
    /* retrieve column type */
    return glp_get_col_type(lp, j) - GLP_FR + LPX_FR;
}

function lpx_get_col_lb(lp, j){
    /* retrieve column lower bound */
    var lb = glp_get_col_lb(lp, j);
    if (lb == -DBL_MAX) lb = 0.0;
    return lb;
}

function lpx_get_col_ub(lp, j){
    /* retrieve column upper bound */
    var ub = glp_get_col_ub(lp, j);
    if (ub == +DBL_MAX) ub = 0.0;
    return ub;
}

function lpx_get_col_bnds(lp, j, callback)
{     /* retrieve column bounds */
    callback(lpx_get_col_type(lp, j), lpx_get_col_lb(lp, j), lpx_get_col_ub(lp, j));
}

function lpx_get_obj_coef(lp, j){
    /* retrieve obj. coefficient or constant term */
    return glp_get_obj_coef(lp, j);
}

function lpx_get_num_nz(lp){
    /* retrieve number of constraint coefficients */
    return glp_get_num_nz(lp);
}

function lpx_get_mat_row(lp, i, ind, val){
    /* retrieve row of the constraint matrix */
    return glp_get_mat_row(lp, i, ind, val);
}

function lpx_get_mat_col(lp, j, ind, val){
    /* retrieve column of the constraint matrix */
    return glp_get_mat_col(lp, j, ind, val);
}

function lpx_create_index(lp){
    /* create the name index */
    glp_create_index(lp);
}

function lpx_find_row(lp, name){
    /* find row by its name */
    return glp_find_row(lp, name);
}

function lpx_find_col(lp, name){
    /* find column by its name */
    return glp_find_col(lp, name);
}

function lpx_delete_index(lp){
    /* delete the name index */
    glp_delete_index(lp);
}

function lpx_scale_prob(lp){
    /* scale problem data */
    switch (lpx_get_int_parm(lp, LPX_K_SCALE))
    {  case 0:
        /* no scaling */
        glp_unscale_prob(lp);
        break;
        case 1:
            /* equilibration scaling */
            glp_scale_prob(lp, GLP_SF_EQ);
            break;
        case 2:
            /* geometric mean scaling */
            glp_scale_prob(lp, GLP_SF_GM);
            break;
        case 3:
            /* geometric mean scaling, then equilibration scaling */
            glp_scale_prob(lp, GLP_SF_GM | GLP_SF_EQ);
            break;
        default:
            xassert(lp != lp);
    }
}

function lpx_unscale_prob(lp){
    /* unscale problem data */
    glp_unscale_prob(lp);
}

function lpx_set_row_stat(lp, i, stat){
    /* set (change) row status */
    glp_set_row_stat(lp, i, stat - LPX_BS + GLP_BS);
}

function lpx_set_col_stat(lp, j, stat){
    /* set (change) column status */
    glp_set_col_stat(lp, j, stat - LPX_BS + GLP_BS);
}

function lpx_std_basis(lp){
    /* construct standard initial LP basis */
    glp_std_basis(lp);
}

function lpx_adv_basis(lp){
    /* construct advanced initial LP basis */
    glp_adv_basis(lp, 0);
}

function lpx_cpx_basis(lp){
    /* construct Bixby's initial LP basis */
    glp_cpx_basis(lp);
}

function fill_smcp(lp, parm){
    glp_init_smcp(parm);
    switch (lpx_get_int_parm(lp, LPX_K_MSGLEV))
    {  case 0:  parm.msg_lev = GLP_MSG_OFF;   break;
        case 1:  parm.msg_lev = GLP_MSG_ERR;   break;
        case 2:  parm.msg_lev = GLP_MSG_ON;    break;
        case 3:  parm.msg_lev = GLP_MSG_ALL;   break;
        default: xassert(lp != lp);
    }
    switch (lpx_get_int_parm(lp, LPX_K_DUAL))
    {  case 0:  parm.meth = GLP_PRIMAL;       break;
        case 1:  parm.meth = GLP_DUAL;         break;
        default: xassert(lp != lp);
    }
    switch (lpx_get_int_parm(lp, LPX_K_PRICE))
    {  case 0:  parm.pricing = GLP_PT_STD;    break;
        case 1:  parm.pricing = GLP_PT_PSE;    break;
        default: xassert(lp != lp);
    }
    if (lpx_get_real_parm(lp, LPX_K_RELAX) == 0.0)
        parm.r_test = GLP_RT_STD;
    else
        parm.r_test = GLP_RT_HAR;
    parm.tol_bnd = lpx_get_real_parm(lp, LPX_K_TOLBND);
    parm.tol_dj  = lpx_get_real_parm(lp, LPX_K_TOLDJ);
    parm.tol_piv = lpx_get_real_parm(lp, LPX_K_TOLPIV);
    parm.obj_ll  = lpx_get_real_parm(lp, LPX_K_OBJLL);
    parm.obj_ul  = lpx_get_real_parm(lp, LPX_K_OBJUL);
    if (lpx_get_int_parm(lp, LPX_K_ITLIM) < 0)
        parm.it_lim = INT_MAX;
    else
        parm.it_lim = lpx_get_int_parm(lp, LPX_K_ITLIM);
    if (lpx_get_real_parm(lp, LPX_K_TMLIM) < 0.0)
        parm.tm_lim = INT_MAX;
    else
        parm.tm_lim =
            (1000.0 * lpx_get_real_parm(lp, LPX_K_TMLIM));
    parm.out_frq = lpx_get_int_parm(lp, LPX_K_OUTFRQ);
    parm.out_dly =
        (1000.0 * lpx_get_real_parm(lp, LPX_K_OUTDLY));
    switch (lpx_get_int_parm(lp, LPX_K_PRESOL))
    {  case 0:  parm.presolve = GLP_OFF;      break;
        case 1:  parm.presolve = GLP_ON;       break;
        default: xassert(lp != lp);
    }
}

function lpx_simplex(lp){
    /* easy-to-use driver to the simplex method */
    var parm = {};
    var ret;
    fill_smcp(lp, parm);
    ret = glp_simplex(lp, parm);
    switch (ret)
    {  case 0:           ret = LPX_E_OK;      break;
        case GLP_EBADB:
        case GLP_ESING:
        case GLP_ECOND:
        case GLP_EBOUND:  ret = LPX_E_FAULT;   break;
        case GLP_EFAIL:   ret = LPX_E_SING;    break;
        case GLP_EOBJLL:  ret = LPX_E_OBJLL;   break;
        case GLP_EOBJUL:  ret = LPX_E_OBJUL;   break;
        case GLP_EITLIM:  ret = LPX_E_ITLIM;   break;
        case GLP_ETMLIM:  ret = LPX_E_TMLIM;   break;
        case GLP_ENOPFS:  ret = LPX_E_NOPFS;   break;
        case GLP_ENODFS:  ret = LPX_E_NODFS;   break;
        default:          xassert(ret != ret);
    }
    return ret;
}

function lpx_exact(lp){
    /* easy-to-use driver to the exact simplex method */
    var parm = {};
    var ret;
    fill_smcp(lp, parm);
    ret = glp_exact(lp, parm);
    switch (ret)
    {  case 0:           ret = LPX_E_OK;      break;
        case GLP_EBADB:
        case GLP_ESING:
        case GLP_EBOUND:
        case GLP_EFAIL:   ret = LPX_E_FAULT;   break;
        case GLP_EITLIM:  ret = LPX_E_ITLIM;   break;
        case GLP_ETMLIM:  ret = LPX_E_TMLIM;   break;
        default:          xassert(ret != ret);
    }
    return ret;
}

function lpx_get_status(lp){
    /* retrieve generic status of basic solution */
    var status;
    switch (glp_get_status(lp))
    {  case GLP_OPT:    status = LPX_OPT;    break;
        case GLP_FEAS:   status = LPX_FEAS;   break;
        case GLP_INFEAS: status = LPX_INFEAS; break;
        case GLP_NOFEAS: status = LPX_NOFEAS; break;
        case GLP_UNBND:  status = LPX_UNBND;  break;
        case GLP_UNDEF:  status = LPX_UNDEF;  break;
        default:         xassert(lp != lp);
    }
    return status;
}

function lpx_get_prim_stat(lp){
    /* retrieve status of primal basic solution */
    return glp_get_prim_stat(lp) - GLP_UNDEF + LPX_P_UNDEF;
}

function lpx_get_dual_stat(lp){
    /* retrieve status of dual basic solution */
    return glp_get_dual_stat(lp) - GLP_UNDEF + LPX_D_UNDEF;
}

function lpx_get_obj_val(lp){
    /* retrieve objective value (basic solution) */
    return glp_get_obj_val(lp);
}

function lpx_get_row_stat(lp, i){
    /* retrieve row status (basic solution) */
    return glp_get_row_stat(lp, i) - GLP_BS + LPX_BS;
}

function lpx_get_row_prim(lp, i){
    /* retrieve row primal value (basic solution) */
    return glp_get_row_prim(lp, i);
}

function lpx_get_row_dual(lp, i){
    /* retrieve row dual value (basic solution) */
    return glp_get_row_dual(lp, i);
}

function lpx_get_row_info(lp, i, callback){
    /* obtain row solution information */
    callback(lpx_get_row_stat(lp, i), lpx_get_row_prim(lp, i), lpx_get_row_dual(lp, i))
}

function lpx_get_col_stat(lp, j){
    /* retrieve column status (basic solution) */
    return glp_get_col_stat(lp, j) - GLP_BS + LPX_BS;
}

function lpx_get_col_prim(lp, j){
    /* retrieve column primal value (basic solution) */
    return glp_get_col_prim(lp, j);
}

function lpx_get_col_dual(lp, j){
    /* retrieve column dual value (basic solution) */
    return glp_get_col_dual(lp, j);
}

function lpx_get_col_info(lp, j, callback){
    /* obtain column solution information */
    callback(lpx_get_col_stat(lp, j), lpx_get_col_prim(lp, j), lpx_get_col_dual(lp, j));
}

function lpx_get_ray_info(lp){
    /* determine what causes primal unboundness */
    return glp_get_unbnd_ray(lp);
}

function lpx_check_kkt(lp, scaled, kkt){
    /* check Karush-Kuhn-Tucker conditions */
    xassert(scaled == scaled);
    _glp_check_kkt(lp, GLP_SOL, GLP_KKT_PE,
        function(ae_max, ae_ind, re_max, re_ind){
            kkt.pe_ae_max = ae_max;
            kkt.pe_ae_row = ae_ind;
            kkt.pe_re_max = re_max;
            kkt.pe_re_row = re_ind;
            if (re_max <= 1e-9)
                kkt.pe_quality = 'H';
            else if (re_max <= 1e-6)
                kkt.pe_quality = 'M';
            else if (re_max <= 1e-3)
                kkt.pe_quality = 'L';
            else
                kkt.pe_quality = '?';
        }
    );

    _glp_check_kkt(lp, GLP_SOL, GLP_KKT_PB,
        function(ae_max, ae_ind, re_max, re_ind){
            kkt.pb_ae_max = ae_max;
            kkt.pb_ae_ind = ae_ind;
            kkt.pb_re_max = re_max;
            kkt.pb_re_ind = re_ind;
            if (re_max <= 1e-9)
                kkt.pb_quality = 'H';
            else if (re_max <= 1e-6)
                kkt.pb_quality = 'M';
            else if (re_max <= 1e-3)
                kkt.pb_quality = 'L';
            else
                kkt.pb_quality = '?';
        }
    );

    _glp_check_kkt(lp, GLP_SOL, GLP_KKT_DE,
        function(ae_max, ae_ind, re_max, re_ind){
            kkt.de_ae_max = ae_max;
            if (ae_ind == 0)
                kkt.de_ae_col = 0;
            else
                kkt.de_ae_col = ae_ind - lp.m;
            kkt.de_re_max = re_max;
            if (re_ind == 0)
                kkt.de_re_col = 0;
            else
                kkt.de_re_col = ae_ind - lp.m;
            if (re_max <= 1e-9)
                kkt.de_quality = 'H';
            else if (re_max <= 1e-6)
                kkt.de_quality = 'M';
            else if (re_max <= 1e-3)
                kkt.de_quality = 'L';
            else
                kkt.de_quality = '?';
        }
    );

    _glp_check_kkt(lp, GLP_SOL, GLP_KKT_DB,
        function(ae_max, ae_ind, re_max, re_ind){
            kkt.db_ae_max = ae_max;
            kkt.db_ae_ind = ae_ind;
            kkt.db_re_max = re_max;
            kkt.db_re_ind = re_ind;
            if (re_max <= 1e-9)
                kkt.db_quality = 'H';
            else if (re_max <= 1e-6)
                kkt.db_quality = 'M';
            else if (re_max <= 1e-3)
                kkt.db_quality = 'L';
            else
                kkt.db_quality = '?';
            kkt.cs_ae_max = 0.0; kkt.cs_ae_ind = 0;
            kkt.cs_re_max = 0.0; kkt.cs_re_ind = 0;
            kkt.cs_quality = 'H';
        }
    );
}

function lpx_warm_up(lp){
    /* "warm up" LP basis */
    var ret = glp_warm_up(lp);
    if (ret == 0)
        ret = LPX_E_OK;
    else if (ret == GLP_EBADB)
        ret = LPX_E_BADB;
    else if (ret == GLP_ESING)
        ret = LPX_E_SING;
    else if (ret == GLP_ECOND)
        ret = LPX_E_SING;
    else
        xassert(ret != ret);
    return ret;
}

function lpx_eval_tab_row(lp, k, ind, val){
    /* compute row of the simplex tableau */
    return glp_eval_tab_row(lp, k, ind, val);
}

function lpx_eval_tab_col(lp, k, ind, val){
    /* compute column of the simplex tableau */
    return glp_eval_tab_col(lp, k, ind, val);
}

function lpx_transform_row(lp, len, ind, val){
    /* transform explicitly specified row */
    return glp_transform_row(lp, len, ind, val);
}

function lpx_transform_col(lp, len, ind, val){
    /* transform explicitly specified column */
    return glp_transform_col(lp, len, ind, val);
}

function lpx_prim_ratio_test(lp, len, ind, val, how, tol){
    /* perform primal ratio test */
    var piv = glp_prim_rtest(lp, len, ind, val, how, tol);
    xassert(0 <= piv && piv <= len);
    return piv == 0 ? 0 : ind[piv];
}

function lpx_dual_ratio_test(lp, len, ind, val, how, tol){
    /* perform dual ratio test */
    var piv = glp_dual_rtest(lp, len, ind, val, how, tol);
    xassert(0 <= piv && piv <= len);
    return piv == 0 ? 0 : ind[piv];
}

function lpx_interior(lp){
    /* easy-to-use driver to the interior-point method */
    var ret = glp_interior(lp, null);
    switch (ret)
    {  case 0:           ret = LPX_E_OK;      break;
        case GLP_EFAIL:   ret = LPX_E_FAULT;   break;
        case GLP_ENOFEAS: ret = LPX_E_NOFEAS;  break;
        case GLP_ENOCVG:  ret = LPX_E_NOCONV;  break;
        case GLP_EITLIM:  ret = LPX_E_ITLIM;   break;
        case GLP_EINSTAB: ret = LPX_E_INSTAB;  break;
        default:          xassert(ret != ret);
    }
    return ret;
}

function lpx_ipt_status(lp){
    /* retrieve status of interior-point solution */
    var status;
    switch (glp_ipt_status(lp))
    {  case GLP_UNDEF:  status = LPX_T_UNDEF;  break;
        case GLP_OPT:    status = LPX_T_OPT;    break;
        default:         xassert(lp != lp);
    }
    return status;
}

function lpx_ipt_obj_val(lp){
    /* retrieve objective value (interior point) */
    return glp_ipt_obj_val(lp);
}

function lpx_ipt_row_prim(lp, i){
    /* retrieve row primal value (interior point) */
    return glp_ipt_row_prim(lp, i);
}

function lpx_ipt_row_dual(lp, i){
    /* retrieve row dual value (interior point) */
    return glp_ipt_row_dual(lp, i);
}

function lpx_ipt_col_prim(lp, j){
    /* retrieve column primal value (interior point) */
    return glp_ipt_col_prim(lp, j);
}

function lpx_ipt_col_dual(lp, j){
    /* retrieve column dual value (interior point) */
    return glp_ipt_col_dual(lp, j);
}

function lpx_set_class(lp, klass){
    /* set problem class */
    xassert(lp == lp);
    if (!(klass == LPX_LP || klass == LPX_MIP))
        xerror("lpx_set_class: invalid problem class");
}

function lpx_get_class(lp){
    /* determine problem klass */
    return glp_get_num_int(lp) == 0 ? LPX_LP : LPX_MIP;
}

function lpx_set_col_kind(lp, j, kind){
    /* set (change) column kind */
    glp_set_col_kind(lp, j, kind - LPX_CV + GLP_CV);
}

function lpx_get_col_kind(lp, j){
    /* retrieve column kind */
    return glp_get_col_kind(lp, j) == GLP_CV ? LPX_CV : LPX_IV;
}

function lpx_get_num_int(lp){
    /* retrieve number of integer columns */
    return glp_get_num_int(lp);
}

function lpx_get_num_bin(lp){
    /* retrieve number of binary columns */
    return glp_get_num_bin(lp);
}

function solve_mip(lp, presolve){
    var parm = {};
    var ret;
    glp_init_iocp(parm);
    switch (lpx_get_int_parm(lp, LPX_K_MSGLEV))
    {  case 0:  parm.msg_lev = GLP_MSG_OFF;   break;
        case 1:  parm.msg_lev = GLP_MSG_ERR;   break;
        case 2:  parm.msg_lev = GLP_MSG_ON;    break;
        case 3:  parm.msg_lev = GLP_MSG_ALL;   break;
        default: xassert(lp != lp);
    }
    switch (lpx_get_int_parm(lp, LPX_K_BRANCH))
    {  case 0:  parm.br_tech = GLP_BR_FFV;    break;
        case 1:  parm.br_tech = GLP_BR_LFV;    break;
        case 2:  parm.br_tech = GLP_BR_DTH;    break;
        case 3:  parm.br_tech = GLP_BR_MFV;    break;
        default: xassert(lp != lp);
    }
    switch (lpx_get_int_parm(lp, LPX_K_BTRACK))
    {  case 0:  parm.bt_tech = GLP_BT_DFS;    break;
        case 1:  parm.bt_tech = GLP_BT_BFS;    break;
        case 2:  parm.bt_tech = GLP_BT_BPH;    break;
        case 3:  parm.bt_tech = GLP_BT_BLB;    break;
        default: xassert(lp != lp);
    }
    parm.tol_int = lpx_get_real_parm(lp, LPX_K_TOLINT);
    parm.tol_obj = lpx_get_real_parm(lp, LPX_K_TOLOBJ);
    if (lpx_get_real_parm(lp, LPX_K_TMLIM) < 0.0 ||
        lpx_get_real_parm(lp, LPX_K_TMLIM) > 1e6)
        parm.tm_lim = INT_MAX;
    else
        parm.tm_lim =
            (1000.0 * lpx_get_real_parm(lp, LPX_K_TMLIM));
    parm.mip_gap = lpx_get_real_parm(lp, LPX_K_MIPGAP);
    if (lpx_get_int_parm(lp, LPX_K_USECUTS) & LPX_C_GOMORY)
        parm.gmi_cuts = GLP_ON;
    else
        parm.gmi_cuts = GLP_OFF;
    if (lpx_get_int_parm(lp, LPX_K_USECUTS) & LPX_C_MIR)
        parm.mir_cuts = GLP_ON;
    else
        parm.mir_cuts = GLP_OFF;
    if (lpx_get_int_parm(lp, LPX_K_USECUTS) & LPX_C_COVER)
        parm.cov_cuts = GLP_ON;
    else
        parm.cov_cuts = GLP_OFF;
    if (lpx_get_int_parm(lp, LPX_K_USECUTS) & LPX_C_CLIQUE)
        parm.clq_cuts = GLP_ON;
    else
        parm.clq_cuts = GLP_OFF;
    parm.presolve = presolve;
    if (lpx_get_int_parm(lp, LPX_K_BINARIZE))
        parm.binarize = GLP_ON;
    ret = glp_intopt(lp, parm);
    switch (ret)
    {  case 0:           ret = LPX_E_OK;      break;
        case GLP_ENOPFS:  ret = LPX_E_NOPFS;   break;
        case GLP_ENODFS:  ret = LPX_E_NODFS;   break;
        case GLP_EBOUND:
        case GLP_EROOT:   ret = LPX_E_FAULT;   break;
        case GLP_EFAIL:   ret = LPX_E_SING;    break;
        case GLP_EMIPGAP: ret = LPX_E_MIPGAP;  break;
        case GLP_ETMLIM:  ret = LPX_E_TMLIM;   break;
        default:          xassert(ret != ret);
    }
    return ret;
}

function lpx_integer(lp){
    /* easy-to-use driver to the branch-and-bound method */
    return solve_mip(lp, GLP_OFF);
}

function lpx_intopt(lp){
    /* easy-to-use driver to the branch-and-bound method */
    return solve_mip(lp, GLP_ON);
}

function lpx_mip_status(lp){
    /* retrieve status of MIP solution */
    var status;
    switch (glp_mip_status(lp))
    {  case GLP_UNDEF:  status = LPX_I_UNDEF;  break;
        case GLP_OPT:    status = LPX_I_OPT;    break;
        case GLP_FEAS:   status = LPX_I_FEAS;   break;
        case GLP_NOFEAS: status = LPX_I_NOFEAS; break;
        default:         xassert(lp != lp);
    }
    return status;
}

function lpx_mip_obj_val(lp){
    /* retrieve objective value (MIP solution) */
    return glp_mip_obj_val(lp);
}

function lpx_mip_row_val(lp, i){
    /* retrieve row value (MIP solution) */
    return glp_mip_row_val(lp, i);
}

function lpx_mip_col_val(lp, j){
    /* retrieve column value (MIP solution) */
    return glp_mip_col_val(lp, j);
}

function lpx_check_int(lp, kkt){
    /* check integer feasibility conditions */
    _glp_check_kkt(lp, GLP_MIP, GLP_KKT_PE,
        function(ae_max, ae_ind, re_max, re_ind){
            kkt.pe_ae_max = ae_max;
            kkt.pe_ae_row = ae_ind;
            kkt.pe_re_max = re_max;
            kkt.pe_re_row = re_ind;
            if (re_max <= 1e-9)
                kkt.pe_quality = 'H';
            else if (re_max <= 1e-6)
                kkt.pe_quality = 'M';
            else if (re_max <= 1e-3)
                kkt.pe_quality = 'L';
            else
                kkt.pe_quality = '?';
        }
    );

    _glp_check_kkt(lp, GLP_MIP, GLP_KKT_PB,
        function(ae_max, ae_ind, re_max, re_ind){
            kkt.pb_ae_max = ae_max;
            kkt.pb_ae_ind = ae_ind;
            kkt.pb_re_max = re_max;
            kkt.pb_re_ind = re_ind;
            if (re_max <= 1e-9)
                kkt.pb_quality = 'H';
            else if (re_max <= 1e-6)
                kkt.pb_quality = 'M';
            else if (re_max <= 1e-3)
                kkt.pb_quality = 'L';
            else
                kkt.pb_quality = '?';
        }
    );
}

function reset_parms(lp){
    /* reset control parameters to default values */
    var cps = lp.parms;
    xassert(cps != null);
    cps.msg_lev  = 3;
    cps.scale    = 1;
    cps.dual     = 0;
    cps.price    = 1;
    cps.relax    = 0.07;
    cps.tol_bnd  = 1e-7;
    cps.tol_dj   = 1e-7;
    cps.tol_piv  = 1e-9;
    cps.round    = 0;
    cps.obj_ll   = -DBL_MAX;
    cps.obj_ul   = +DBL_MAX;
    cps.it_lim   = -1;
    cps.tm_lim   = -1.0;
    cps.out_frq  = 200;
    cps.out_dly  = 0.0;
    cps.branch   = 2;
    cps.btrack   = 3;
    cps.tol_int  = 1e-5;
    cps.tol_obj  = 1e-7;
    cps.mps_info = 1;
    cps.mps_obj  = 2;
    cps.mps_orig = 0;
    cps.mps_wide = 1;
    cps.mps_free = 0;
    cps.mps_skip = 0;
    cps.lpt_orig = 0;
    cps.presol = 0;
    cps.binarize = 0;
    cps.use_cuts = 0;
    cps.mip_gap = 0.0;
}

function access_parms(lp){
    /* allocate and initialize control parameters, if necessary */
    if (lp.parms == null)
    {  lp.parms = {};
        reset_parms(lp);
    }
    return lp.parms;
}

function lpx_reset_parms(lp){
    /* reset control parameters to default values */
    access_parms(lp);
    reset_parms(lp);
}

function lpx_set_int_parm(lp, parm, val){
    /* set (change) integer control parameter */
    var cps = access_parms(lp);
    switch (parm)
    {  case LPX_K_MSGLEV:
        if (!(0 <= val && val <= 3))
            xerror("lpx_set_int_parm: MSGLEV = " + val + "; invalid value");
        cps.msg_lev = val;
        break;
        case LPX_K_SCALE:
            if (!(0 <= val && val <= 3))
                xerror("lpx_set_int_parm: SCALE = " + val + "; invalid value");
            cps.scale = val;
            break;
        case LPX_K_DUAL:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: DUAL = " + val + "; invalid value");
            cps.dual = val;
            break;
        case LPX_K_PRICE:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: PRICE = " + val + "; invalid value");
            cps.price = val;
            break;
        case LPX_K_ROUND:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: ROUND = " + val + "; invalid value");
            cps.round = val;
            break;
        case LPX_K_ITLIM:
            cps.it_lim = val;
            break;
        case LPX_K_ITCNT:
            lp.it_cnt = val;
            break;
        case LPX_K_OUTFRQ:
            if (!(val > 0))
                xerror("lpx_set_int_parm: OUTFRQ = " + val + "; invalid value");
            cps.out_frq = val;
            break;
        case LPX_K_BRANCH:
            if (!(val == 0 || val == 1 || val == 2 || val == 3))
                xerror("lpx_set_int_parm: BRANCH = " + val + "; invalid value");
            cps.branch = val;
            break;
        case LPX_K_BTRACK:
            if (!(val == 0 || val == 1 || val == 2 || val == 3))
                xerror("lpx_set_int_parm: BTRACK = " + val + "; invalid value");
            cps.btrack = val;
            break;
        case LPX_K_MPSINFO:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: MPSINFO = " + val + "; invalid value");
            cps.mps_info = val;
            break;
        case LPX_K_MPSOBJ:
            if (!(val == 0 || val == 1 || val == 2))
                xerror("lpx_set_int_parm: MPSOBJ = " + val + "; invalid value");
            cps.mps_obj = val;
            break;
        case LPX_K_MPSORIG:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: MPSORIG = " + val + "; invalid value");
            cps.mps_orig = val;
            break;
        case LPX_K_MPSWIDE:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: MPSWIDE = " + val + "; invalid value");
            cps.mps_wide = val;
            break;
        case LPX_K_MPSFREE:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: MPSFREE = " + val + "; invalid value");
            cps.mps_free = val;
            break;
        case LPX_K_MPSSKIP:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: MPSSKIP = " + val + "; invalid value");
            cps.mps_skip = val;
            break;
        case LPX_K_LPTORIG:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: LPTORIG = " + val + "; invalid value");
            cps.lpt_orig = val;
            break;
        case LPX_K_PRESOL:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: PRESOL = " + val + "; invalid value");
            cps.presol = val;
            break;
        case LPX_K_BINARIZE:
            if (!(val == 0 || val == 1))
                xerror("lpx_set_int_parm: BINARIZE = " + val + "; invalid value");
            cps.binarize = val;
            break;
        case LPX_K_USECUTS:
            if (val & ~LPX_C_ALL)
                xerror("lpx_set_int_parm: USECUTS = " + val + "; invalid value");
            cps.use_cuts = val;
            break;
        case LPX_K_BFTYPE:
        {   parm = {};
            glp_get_bfcp(lp, parm);
            switch (val)
            {  case 1:
                parm.type = GLP_BF_FT; break;
                case 2:
                    parm.type = GLP_BF_BG; break;
                case 3:
                    parm.type = GLP_BF_GR; break;
                default:
                    xerror("lpx_set_int_parm: BFTYPE = " + val + "; invalid value");
            }
            glp_set_bfcp(lp, parm);
        }
            break;
        default:
            xerror("lpx_set_int_parm: parm = " + parm + "; invalid parameter");
    }
}

function lpx_get_int_parm(lp, parm){
    /* query integer control parameter */
    var cps = access_parms(lp);
    var val = 0;
    switch (parm)
    {  case LPX_K_MSGLEV:
        val = cps.msg_lev; break;
        case LPX_K_SCALE:
            val = cps.scale; break;
        case LPX_K_DUAL:
            val = cps.dual; break;
        case LPX_K_PRICE:
            val = cps.price; break;
        case LPX_K_ROUND:
            val = cps.round; break;
        case LPX_K_ITLIM:
            val = cps.it_lim; break;
        case LPX_K_ITCNT:
            val = lp.it_cnt; break;
        case LPX_K_OUTFRQ:
            val = cps.out_frq; break;
        case LPX_K_BRANCH:
            val = cps.branch; break;
        case LPX_K_BTRACK:
            val = cps.btrack; break;
        case LPX_K_MPSINFO:
            val = cps.mps_info; break;
        case LPX_K_MPSOBJ:
            val = cps.mps_obj; break;
        case LPX_K_MPSORIG:
            val = cps.mps_orig; break;
        case LPX_K_MPSWIDE:
            val = cps.mps_wide; break;
        case LPX_K_MPSFREE:
            val = cps.mps_free; break;
        case LPX_K_MPSSKIP:
            val = cps.mps_skip; break;
        case LPX_K_LPTORIG:
            val = cps.lpt_orig; break;
        case LPX_K_PRESOL:
            val = cps.presol; break;
        case LPX_K_BINARIZE:
            val = cps.binarize; break;
        case LPX_K_USECUTS:
            val = cps.use_cuts; break;
        case LPX_K_BFTYPE:
        {   parm = {};
            glp_get_bfcp(lp, parm);
            switch (parm.type)
            {  case GLP_BF_FT:
                val = 1; break;
                case GLP_BF_BG:
                    val = 2; break;
                case GLP_BF_GR:
                    val = 3; break;
                default:
                    xassert(lp != lp);
            }
        }
            break;
        default:
            xerror("lpx_get_int_parm: parm = " + parm + "; invalid parameter");
    }
    return val;
}

function lpx_set_real_parm(lp, parm, val){
    /* set (change) real control parameter */
    var cps = access_parms(lp);
    switch (parm)
    {  case LPX_K_RELAX:
        if (!(0.0 <= val && val <= 1.0))
            xerror("lpx_set_real_parm: RELAX = " + val + "; invalid value");
        cps.relax = val;
        break;
        case LPX_K_TOLBND:
            if (!(DBL_EPSILON <= val && val <= 0.001))
                xerror("lpx_set_real_parm: TOLBND = " + val + "; invalid value");
            cps.tol_bnd = val;
            break;
        case LPX_K_TOLDJ:
            if (!(DBL_EPSILON <= val && val <= 0.001))
                xerror("lpx_set_real_parm: TOLDJ = " + val + "; invalid value");
            cps.tol_dj = val;
            break;
        case LPX_K_TOLPIV:
            if (!(DBL_EPSILON <= val && val <= 0.001))
                xerror("lpx_set_real_parm: TOLPIV = " + val + "; invalid value");
            cps.tol_piv = val;
            break;
        case LPX_K_OBJLL:
            cps.obj_ll = val;
            break;
        case LPX_K_OBJUL:
            cps.obj_ul = val;
            break;
        case LPX_K_TMLIM:
            cps.tm_lim = val;
            break;
        case LPX_K_OUTDLY:
            cps.out_dly = val;
            break;
        case LPX_K_TOLINT:
            if (!(DBL_EPSILON <= val && val <= 0.001))
                xerror("lpx_set_real_parm: TOLINT = " + val + "; invalid value");
            cps.tol_int = val;
            break;
        case LPX_K_TOLOBJ:
            if (!(DBL_EPSILON <= val && val <= 0.001))
                xerror("lpx_set_real_parm: TOLOBJ = " + val + "; invalid value");
            cps.tol_obj = val;
            break;
        case LPX_K_MIPGAP:
            if (val < 0.0)
                xerror("lpx_set_real_parm: MIPGAP = " + val + "; invalid value");
            cps.mip_gap = val;
            break;
        default:
            xerror("lpx_set_real_parm: parm = " + parm + "; invalid parameter");
    }
}

function lpx_get_real_parm(lp, parm){
    /* query real control parameter */
    var cps = access_parms(lp);
    var val = 0.0;
    switch (parm)
    {  case LPX_K_RELAX:
        val = cps.relax;
        break;
        case LPX_K_TOLBND:
            val = cps.tol_bnd;
            break;
        case LPX_K_TOLDJ:
            val = cps.tol_dj;
            break;
        case LPX_K_TOLPIV:
            val = cps.tol_piv;
            break;
        case LPX_K_OBJLL:
            val = cps.obj_ll;
            break;
        case LPX_K_OBJUL:
            val = cps.obj_ul;
            break;
        case LPX_K_TMLIM:
            val = cps.tm_lim;
            break;
        case LPX_K_OUTDLY:
            val = cps.out_dly;
            break;
        case LPX_K_TOLINT:
            val = cps.tol_int;
            break;
        case LPX_K_TOLOBJ:
            val = cps.tol_obj;
            break;
        case LPX_K_MIPGAP:
            val = cps.mip_gap;
            break;
        default:
            xerror("lpx_get_real_parm: parm = " + parm + "; invalid parameter");
    }
    return val;
}

function lpx_read_mps(fname){
    /* read problem data in fixed MPS format */
    var lp = lpx_create_prob();
    if (glp_read_mps(lp, GLP_MPS_DECK, null, fname)){
        lpx_delete_prob(lp); lp = null;
    }
    return lp;
}

function lpx_write_mps(lp, fname){
    /* write problem data in fixed MPS format */
    return glp_write_mps(lp, GLP_MPS_DECK, null, fname);
}

function lpx_read_bas(lp, fname){
    /* read LP basis in fixed MPS format */
    xassert(lp == lp);
    xassert(fname == fname);
    xerror("lpx_read_bas: operation not supported");
    return 0;
}

function lpx_write_bas(lp, fname){
    /* write LP basis in fixed MPS format */
    xassert(lp == lp);
    xassert(fname == fname);
    xerror("lpx_write_bas: operation not supported");
    return 0;
}

function lpx_read_freemps(fname){
    /* read problem data in free MPS format */
    var lp = lpx_create_prob();
    if (glp_read_mps(lp, GLP_MPS_FILE, null, fname)){
        lpx_delete_prob(lp); lp = null;
    }
    return lp;
}

function lpx_write_freemps(lp, fname){
    /* write problem data in free MPS format */
    return glp_write_mps(lp, GLP_MPS_FILE, null, fname);
}

function lpx_read_cpxlp(fname){
    /* read problem data in CPLEX LP format */
    var lp = lpx_create_prob();
    if (glp_read_lp(lp, null, fname)){
        lpx_delete_prob(lp); lp = null;
    }
    return lp;
}

function lpx_write_cpxlp(lp, fname){
    /* write problem data in CPLEX LP format */
    return glp_write_lp(lp, null, fname);
}

function lpx_read_model(model, data, output){
    /* read LP/MIP model written in GNU MathProg language */
    var lp = null;
    /* allocate the translator workspace */
    var tran = glp_mpl_alloc_wksp();
    /* read model section and optional data section */
    if (glp_mpl_read_model(tran, model, data != null)) return done();
    /* read separate data section, if required */
    if (data != null)
        if (glp_mpl_read_data(tran, data)) return done();
    /* generate the model */
    if (glp_mpl_generate(tran, output)) return done();
    /* build the problem instance from the model */
    lp = glp_create_prob();
    glp_mpl_build_prob(tran, lp);
    function done(){
        /* free the translator workspace */
        glp_mpl_free_wksp(tran);
        /* bring the problem object to the calling program */
        return lp;
    }
    return done();
}

function lpx_print_prob(lp, fname){
    /* write problem data in plain text format */
    return glp_write_lp(lp, null, fname);
}

function lpx_print_sol(lp, fname){
    /* write LP problem solution in printable format */
    return glp_print_sol(lp, fname);
}

function lpx_print_sens_bnds(lp, fname){
    /* write bounds sensitivity information */
    if (glp_get_status(lp) == GLP_OPT && !glp_bf_exists(lp))
        glp_factorize(lp);
    return glp_print_ranges(lp, 0, null, 0, fname);
}

function lpx_print_ips(lp, fname){
    /* write interior point solution in printable format */
    return glp_print_ipt(lp, fname);
}

function lpx_print_mip(lp, fname){
    /* write MIP problem solution in printable format */
    return glp_print_mip(lp, fname);
}

function lpx_is_b_avail(lp){
    /* check if LP basis is available */
    return glp_bf_exists(lp);
}

function lpx_main(argc, argv)
{     /* stand-alone LP/MIP solver */
    return glp_main(argc, argv);
}

/* return codes: */
const
    LUF_ESING   = 1,  /* singular matrix */
    LUF_ECOND   = 2;  /* ill-conditioned matrix */

function luf_create_it(){
    var luf = {};
    luf.n_max = luf.n = 0;
    luf.valid = 0;
    luf.fr_ptr = luf.fr_len = null;
    luf.fc_ptr = luf.fc_len = null;
    luf.vr_ptr = luf.vr_len = luf.vr_cap = null;
    luf.vr_piv = null;
    luf.vc_ptr = luf.vc_len = luf.vc_cap = null;
    luf.pp_row = luf.pp_col = null;
    luf.qq_row = luf.qq_col = null;
    luf.sv_size = 0;
    luf.sv_beg = luf.sv_end = 0;
    luf.sv_ind = null;
    luf.sv_val = null;
    luf.sv_head = luf.sv_tail = 0;
    luf.sv_prev = luf.sv_next = null;
    luf.vr_max = null;
    luf.rs_head = luf.rs_prev = luf.rs_next = null;
    luf.cs_head = luf.cs_prev = luf.cs_next = null;
    luf.flag = null;
    luf.work = null;
    luf.new_sva = 0;
    luf.piv_tol = 0.10;
    luf.piv_lim = 4;
    luf.suhl = 1;
    luf.eps_tol = 1e-15;
    luf.max_gro = 1e+10;
    luf.nnz_a = luf.nnz_f = luf.nnz_v = 0;
    luf.max_a = luf.big_v = 0.0;
    luf.rank = 0;
    return luf;
}

function luf_defrag_sva(luf){
    var n = luf.n;
    var vr_ptr = luf.vr_ptr;
    var vr_len = luf.vr_len;
    var vr_cap = luf.vr_cap;
    var vc_ptr = luf.vc_ptr;
    var vc_len = luf.vc_len;
    var vc_cap = luf.vc_cap;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var sv_next = luf.sv_next;
    var sv_beg = 1;
    var i, j, k;
    /* skip rows and columns, which do not need to be relocated */
    for (k = luf.sv_head; k != 0; k = sv_next[k])
    {  if (k <= n)
    {  /* i-th row of the matrix V */
        i = k;
        if (vr_ptr[i] != sv_beg) break;
        vr_cap[i] = vr_len[i];
        sv_beg += vr_cap[i];
    }
    else
    {  /* j-th column of the matrix V */
        j = k - n;
        if (vc_ptr[j] != sv_beg) break;
        vc_cap[j] = vc_len[j];
        sv_beg += vc_cap[j];
    }
    }
    /* relocate other rows and columns in order to gather all unused
     locations in one continuous extent */
    for (; k != 0; k = sv_next[k])
    {  if (k <= n)
    {  /* i-th row of the matrix V */
        i = k;
        xcopyArr(sv_ind, sv_beg, sv_ind, vr_ptr[i], vr_len[i]);
        xcopyArr(sv_val, sv_beg, sv_val, vr_ptr[i], vr_len[i]);
        vr_ptr[i] = sv_beg;
        vr_cap[i] = vr_len[i];
        sv_beg += vr_cap[i];
    }
    else
    {  /* j-th column of the matrix V */
        j = k - n;
        xcopyArr(sv_ind, sv_beg, sv_ind, vc_ptr[j], vc_len[j]);
        xcopyArr(sv_val, sv_beg, sv_val ,vc_ptr[j], vc_len[j]);
        vc_ptr[j] = sv_beg;
        vc_cap[j] = vc_len[j];
        sv_beg += vc_cap[j];
    }
    }
    /* set new pointer to the beginning of the free part */
    luf.sv_beg = sv_beg;
}

function luf_enlarge_row(luf, i, cap){
    var n = luf.n;
    var vr_ptr = luf.vr_ptr;
    var vr_len = luf.vr_len;
    var vr_cap = luf.vr_cap;
    var vc_cap = luf.vc_cap;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var sv_prev = luf.sv_prev;
    var sv_next = luf.sv_next;
    var ret = 0;
    var cur, k, kk;
    xassert(1 <= i && i <= n);
    xassert(vr_cap[i] < cap);
    /* if there are less than cap free locations, defragment SVA */
    if (luf.sv_end - luf.sv_beg < cap)
    {  luf_defrag_sva(luf);
        if (luf.sv_end - luf.sv_beg < cap)
        {  ret = 1;
            return ret;
        }
    }
    /* save current capacity of the i-th row */
    cur = vr_cap[i];
    /* copy existing elements to the beginning of the free part */
    xcopyArr(sv_ind, luf.sv_beg, sv_ind, vr_ptr[i], vr_len[i]);
    xcopyArr(sv_val, luf.sv_beg, sv_val, vr_ptr[i], vr_len[i]);
    /* set new pointer and new capacity of the i-th row */
    vr_ptr[i] = luf.sv_beg;
    vr_cap[i] = cap;
    /* set new pointer to the beginning of the free part */
    luf.sv_beg += cap;
    /* now the i-th row starts in the rightmost location among other
     rows and columns of the matrix V, so its node should be moved
     to the end of the row/column linked list */
    k = i;
    /* remove the i-th row node from the linked list */
    if (sv_prev[k] == 0)
        luf.sv_head = sv_next[k];
    else
    {  /* capacity of the previous row/column can be increased at the
     expense of old locations of the i-th row */
        kk = sv_prev[k];
        if (kk <= n) vr_cap[kk] += cur; else vc_cap[kk-n] += cur;
        sv_next[sv_prev[k]] = sv_next[k];
    }
    if (sv_next[k] == 0)
        luf.sv_tail = sv_prev[k];
    else
        sv_prev[sv_next[k]] = sv_prev[k];
    /* insert the i-th row node to the end of the linked list */
    sv_prev[k] = luf.sv_tail;
    sv_next[k] = 0;
    if (sv_prev[k] == 0)
        luf.sv_head = k;
    else
        sv_next[sv_prev[k]] = k;
    luf.sv_tail = k;
    return ret;
}

function luf_enlarge_col(luf, j, cap){
    var n = luf.n;
    var vr_cap = luf.vr_cap;
    var vc_ptr = luf.vc_ptr;
    var vc_len = luf.vc_len;
    var vc_cap = luf.vc_cap;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var sv_prev = luf.sv_prev;
    var sv_next = luf.sv_next;
    var ret = 0;
    var cur, k, kk;
    xassert(1 <= j && j <= n);
    xassert(vc_cap[j] < cap);
    /* if there are less than cap free locations, defragment SVA */
    if (luf.sv_end - luf.sv_beg < cap)
    {  luf_defrag_sva(luf);
        if (luf.sv_end - luf.sv_beg < cap)
        {  ret = 1;
            return ret;
        }
    }
    /* save current capacity of the j-th column */
    cur = vc_cap[j];
    /* copy existing elements to the beginning of the free part */
    xcopyArr(sv_ind, luf.sv_beg, sv_ind, vc_ptr[j], vc_len[j]);
    xcopyArr(sv_val, luf.sv_beg, sv_val, vc_ptr[j], vc_len[j]);
    /* set new pointer and new capacity of the j-th column */
    vc_ptr[j] = luf.sv_beg;
    vc_cap[j] = cap;
    /* set new pointer to the beginning of the free part */
    luf.sv_beg += cap;
    /* now the j-th column starts in the rightmost location among
     other rows and columns of the matrix V, so its node should be
     moved to the end of the row/column linked list */
    k = n + j;
    /* remove the j-th column node from the linked list */
    if (sv_prev[k] == 0)
        luf.sv_head = sv_next[k];
    else
    {  /* capacity of the previous row/column can be increased at the
     expense of old locations of the j-th column */
        kk = sv_prev[k];
        if (kk <= n) vr_cap[kk] += cur; else vc_cap[kk-n] += cur;
        sv_next[sv_prev[k]] = sv_next[k];
    }
    if (sv_next[k] == 0)
        luf.sv_tail = sv_prev[k];
    else
        sv_prev[sv_next[k]] = sv_prev[k];
    /* insert the j-th column node to the end of the linked list */
    sv_prev[k] = luf.sv_tail;
    sv_next[k] = 0;
    if (sv_prev[k] == 0)
        luf.sv_head = k;
    else
        sv_next[sv_prev[k]] = k;
    luf.sv_tail = k;
    return ret;
}

function reallocate(luf, n){
    var n_max = luf.n_max;
    luf.n = n;
    if (n <= n_max) return;
    luf.n_max = n_max = n + 100;
    luf.fr_ptr = new Array(1+n_max);
    luf.fr_len = new Array(1+n_max);
    luf.fc_ptr = new Array(1+n_max);
    luf.fc_len = new Array(1+n_max);
    luf.vr_ptr = new Array(1+n_max);
    luf.vr_len = new Array(1+n_max);
    luf.vr_cap = new Array(1+n_max);
    luf.vr_piv = new Array(1+n_max);
    luf.vc_ptr = new Array(1+n_max);
    luf.vc_len = new Array(1+n_max);
    luf.vc_cap = new Array(1+n_max);
    luf.pp_row = new Array(1+n_max);
    luf.pp_col = new Array(1+n_max);
    luf.qq_row = new Array(1+n_max);
    luf.qq_col = new Array(1+n_max);
    luf.sv_prev = new Array(1+n_max+n_max);
    luf.sv_next = new Array(1+n_max+n_max);
    luf.vr_max = new Array(1+n_max);
    luf.rs_head = new Array(1+n_max);
    luf.rs_prev = new Array(1+n_max);
    luf.rs_next = new Array(1+n_max);
    luf.cs_head = new Array(1+n_max);
    luf.cs_prev = new Array(1+n_max);
    luf.cs_next = new Array(1+n_max);
    luf.flag = new Array(1+n_max);
    luf.work = new Array(1+n_max);
}

function initialize(luf, col, info){
    var n = luf.n;
    var fc_ptr = luf.fc_ptr;
    var fc_len = luf.fc_len;
    var vr_ptr = luf.vr_ptr;
    var vr_len = luf.vr_len;
    var vr_cap = luf.vr_cap;
    var vc_ptr = luf.vc_ptr;
    var vc_len = luf.vc_len;
    var vc_cap = luf.vc_cap;
    var pp_row = luf.pp_row;
    var pp_col = luf.pp_col;
    var qq_row = luf.qq_row;
    var qq_col = luf.qq_col;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var sv_prev = luf.sv_prev;
    var sv_next = luf.sv_next;
    var vr_max = luf.vr_max;
    var rs_head = luf.rs_head;
    var rs_prev = luf.rs_prev;
    var rs_next = luf.rs_next;
    var cs_head = luf.cs_head;
    var cs_prev = luf.cs_prev;
    var cs_next = luf.cs_next;
    var flag = luf.flag;
    var work = luf.work;
    var ret = 0;
    var i, i_ptr, j, j_beg, j_end, k, len, nnz, sv_beg, sv_end, ptr;
    var big, val;
    /* free all locations of the sparse vector area */
    sv_beg = 1;
    sv_end = luf.sv_size + 1;
    /* (row-wise representation of the matrix F is not initialized,
     because it is not used at the factorization stage) */
    /* build the matrix F in column-wise format (initially F = I) */
    for (j = 1; j <= n; j++)
    {  fc_ptr[j] = sv_end;
        fc_len[j] = 0;
    }
    /* clear rows of the matrix V; clear the flag array */
    for (i = 1; i <= n; i++)
        vr_len[i] = vr_cap[i] = 0, flag[i] = 0;
    /* build the matrix V in column-wise format (initially V = A);
     count non-zeros in rows of this matrix; count total number of
     non-zeros; compute largest of absolute values of elements */
    nnz = 0;
    big = 0.0;
    for (j = 1; j <= n; j++)
    {  var rn = pp_row;
        var aj = work;
        /* obtain j-th column of the matrix A */
        len = col(info, j, rn, aj);
        if (!(0 <= len && len <= n))
            xerror("luf_factorize: j = " + j + "; len = " + len + "; invalid column length");
        /* check for free locations */
        if (sv_end - sv_beg < len)
        {  /* overflow of the sparse vector area */
            ret = 1;
            return ret;
        }
        /* set pointer to the j-th column */
        vc_ptr[j] = sv_beg;
        /* set length of the j-th column */
        vc_len[j] = vc_cap[j] = len;
        /* count total number of non-zeros */
        nnz += len;
        /* walk through elements of the j-th column */
        for (ptr = 1; ptr <= len; ptr++)
        {  /* get row index and numerical value of a[i,j] */
            i = rn[ptr];
            val = aj[ptr];
            if (!(1 <= i && i <= n))
                xerror("luf_factorize: i = " + i + "; j = " + j + "; invalid row index");
            if (flag[i])
                xerror("luf_factorize: i = " + i + "; j = " + j + "; duplicate element not allowed");
            if (val == 0.0)
                xerror("luf_factorize: i = " + i + "; j = " + j + "; zero element not allowed");
            /* add new element v[i,j] = a[i,j] to j-th column */
            sv_ind[sv_beg] = i;
            sv_val[sv_beg] = val;
            sv_beg++;
            /* big := max(big, |a[i,j]|) */
            if (val < 0.0) val = - val;
            if (big < val) big = val;
            /* mark non-zero in the i-th position of the j-th column */
            flag[i] = 1;
            /* increase length of the i-th row */
            vr_cap[i]++;
        }
        /* reset all non-zero marks */
        for (ptr = 1; ptr <= len; ptr++) flag[rn[ptr]] = 0;
    }
    /* allocate rows of the matrix V */
    for (i = 1; i <= n; i++)
    {  /* get length of the i-th row */
        len = vr_cap[i];
        /* check for free locations */
        if (sv_end - sv_beg < len)
        {  /* overflow of the sparse vector area */
            ret = 1;
            return ret;
        }
        /* set pointer to the i-th row */
        vr_ptr[i] = sv_beg;
        /* reserve locations for the i-th row */
        sv_beg += len;
    }
    /* build the matrix V in row-wise format using representation of
     this matrix in column-wise format */
    for (j = 1; j <= n; j++)
    {  /* walk through elements of the j-th column */
        j_beg = vc_ptr[j];
        j_end = j_beg + vc_len[j] - 1;
        for (k = j_beg; k <= j_end; k++)
        {  /* get row index and numerical value of v[i,j] */
            i = sv_ind[k];
            val = sv_val[k];
            /* store element in the i-th row */
            i_ptr = vr_ptr[i] + vr_len[i];
            sv_ind[i_ptr] = j;
            sv_val[i_ptr] = val;
            /* increase count of the i-th row */
            vr_len[i]++;
        }
    }
    /* initialize the matrices P and Q (initially P = Q = I) */
    for (k = 1; k <= n; k++)
        pp_row[k] = pp_col[k] = qq_row[k] = qq_col[k] = k;
    /* set sva partitioning pointers */
    luf.sv_beg = sv_beg;
    luf.sv_end = sv_end;
    /* the initial physical order of rows and columns of the matrix V
     is n+1, ..., n+n, 1, ..., n (firstly columns, then rows) */
    luf.sv_head = n+1;
    luf.sv_tail = n;
    for (i = 1; i <= n; i++)
    {  sv_prev[i] = i-1;
        sv_next[i] = i+1;
    }
    sv_prev[1] = n+n;
    sv_next[n] = 0;
    for (j = 1; j <= n; j++)
    {  sv_prev[n+j] = n+j-1;
        sv_next[n+j] = n+j+1;
    }
    sv_prev[n+1] = 0;
    sv_next[n+n] = 1;
    /* clear working arrays */
    for (k = 1; k <= n; k++)
    {  flag[k] = 0;
        work[k] = 0.0;
    }
    /* initialize some statistics */
    luf.nnz_a = nnz;
    luf.nnz_f = 0;
    luf.nnz_v = nnz;
    luf.max_a = big;
    luf.big_v = big;
    luf.rank = -1;
    /* initially the active submatrix is the entire matrix V */
    /* largest of absolute values of elements in each active row is
     unknown yet */
    for (i = 1; i <= n; i++) vr_max[i] = -1.0;
    /* build linked lists of active rows */
    for (len = 0; len <= n; len++) rs_head[len] = 0;
    for (i = 1; i <= n; i++)
    {  len = vr_len[i];
        rs_prev[i] = 0;
        rs_next[i] = rs_head[len];
        if (rs_next[i] != 0) rs_prev[rs_next[i]] = i;
        rs_head[len] = i;
    }
    /* build linked lists of active columns */
    for (len = 0; len <= n; len++) cs_head[len] = 0;
    for (j = 1; j <= n; j++)
    {  len = vc_len[j];
        cs_prev[j] = 0;
        cs_next[j] = cs_head[len];
        if (cs_next[j] != 0) cs_prev[cs_next[j]] = j;
        cs_head[len] = j;
    }
    /* return to the factorizing routine */
    return ret;
}

function find_pivot(luf, callback){
    var n = luf.n;
    var vr_ptr = luf.vr_ptr;
    var vr_len = luf.vr_len;
    var vc_ptr = luf.vc_ptr;
    var vc_len = luf.vc_len;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var vr_max = luf.vr_max;
    var rs_head = luf.rs_head;
    var rs_next = luf.rs_next;
    var cs_head = luf.cs_head;
    var cs_prev = luf.cs_prev;
    var cs_next = luf.cs_next;
    var piv_tol = luf.piv_tol;
    var piv_lim = luf.piv_lim;
    var suhl = luf.suhl;
    var p, q, len, i, i_beg, i_end, i_ptr, j, j_beg, j_end, j_ptr,
        ncand, next_j, min_p, min_q, min_len;
    var best, cost, big, temp;
    /* initially no pivot candidates have been found so far */
    p = q = 0; best = DBL_MAX; ncand = 0;
    /* if in the active submatrix there is a column that has the only
     non-zero (column singleton), choose it as pivot */
    j = cs_head[1];
    if (j != 0)
    {  xassert(vc_len[j] == 1);
        p = sv_ind[vc_ptr[j]]; q = j;
        return done();
    }
    /* if in the active submatrix there is a row that has the only
     non-zero (row singleton), choose it as pivot */
    i = rs_head[1];
    if (i != 0)
    {  xassert(vr_len[i] == 1);
        p = i; q = sv_ind[vr_ptr[i]];
        return done();
    }
    /* there are no singletons in the active submatrix; walk through
     other non-empty rows and columns */
    for (len = 2; len <= n; len++)
    {  /* consider active columns that have len non-zeros */
        for (j = cs_head[len]; j != 0; j = next_j)
        {  /* the j-th column has len non-zeros */
            j_beg = vc_ptr[j];
            j_end = j_beg + vc_len[j] - 1;
            /* save pointer to the next column with the same length */
            next_j = cs_next[j];
            /* find an element in the j-th column, which is placed in a
             row with minimal number of non-zeros and satisfies to the
             stability condition (such element may not exist) */
            min_p = min_q = 0; min_len = INT_MAX;
            for (j_ptr = j_beg; j_ptr <= j_end; j_ptr++)
            {  /* get row index of v[i,j] */
                i = sv_ind[j_ptr];
                i_beg = vr_ptr[i];
                i_end = i_beg + vr_len[i] - 1;
                /* if the i-th row is not shorter than that one, where
                 minimal element is currently placed, skip v[i,j] */
                if (vr_len[i] >= min_len) continue;
                /* determine the largest of absolute values of elements
                 in the i-th row */
                big = vr_max[i];
                if (big < 0.0)
                {  /* the largest value is unknown yet; compute it */
                    for (i_ptr = i_beg; i_ptr <= i_end; i_ptr++)
                    {  temp = sv_val[i_ptr];
                        if (temp < 0.0) temp = - temp;
                        if (big < temp) big = temp;
                    }
                    vr_max[i] = big;
                }
                /* find v[i,j] in the i-th row */
                for (i_ptr = vr_ptr[i]; sv_ind[i_ptr] != j; i_ptr++){}
                xassert(i_ptr <= i_end);
                /* if v[i,j] doesn't satisfy to the stability condition,
                 skip it */
                temp = sv_val[i_ptr];
                if (temp < 0.0) temp = - temp;
                if (temp < piv_tol * big) continue;
                /* v[i,j] is better than the current minimal element */
                min_p = i; min_q = j; min_len = vr_len[i];
                /* if Markowitz cost of the current minimal element is
                 not greater than (len-1)**2, it can be chosen right
                 now; this heuristic reduces the search and works well
                 in many cases */
                if (min_len <= len)
                {  p = min_p; q = min_q;
                    return done();
                }
            }
            /* the j-th column has been scanned */
            if (min_p != 0)
            {  /* the minimal element is a next pivot candidate */
                ncand++;
                /* compute its Markowitz cost */
                cost = (min_len - 1) * (len - 1);
                /* choose between the minimal element and the current
                 candidate */
                if (cost < best) {p = min_p; q = min_q; best = cost}
                /* if piv_lim candidates have been considered, there are
                 doubts that a much better candidate exists; therefore
                 it's time to terminate the search */
                if (ncand == piv_lim) return done();
            }
            else
            {  /* the j-th column has no elements, which satisfy to the
             stability condition; Uwe Suhl suggests to exclude such
             column from the further consideration until it becomes
             a column singleton; in hard cases this significantly
             reduces a time needed for pivot searching */
                if (suhl)
                {  /* remove the j-th column from the active set */
                    if (cs_prev[j] == 0)
                        cs_head[len] = cs_next[j];
                    else
                        cs_next[cs_prev[j]] = cs_next[j];
                    if (cs_next[j] == 0){
                        /* nop */
                    }
                    else
                        cs_prev[cs_next[j]] = cs_prev[j];
                    /* the following assignment is used to avoid an error
                     when the routine eliminate (see below) will try to
                     remove the j-th column from the active set */
                    cs_prev[j] = cs_next[j] = j;
                }
            }
        }
        /* consider active rows that have len non-zeros */
        for (i = rs_head[len]; i != 0; i = rs_next[i])
        {  /* the i-th row has len non-zeros */
            i_beg = vr_ptr[i];
            i_end = i_beg + vr_len[i] - 1;
            /* determine the largest of absolute values of elements in
             the i-th row */
            big = vr_max[i];
            if (big < 0.0)
            {  /* the largest value is unknown yet; compute it */
                for (i_ptr = i_beg; i_ptr <= i_end; i_ptr++)
                {  temp = sv_val[i_ptr];
                    if (temp < 0.0) temp = - temp;
                    if (big < temp) big = temp;
                }
                vr_max[i] = big;
            }
            /* find an element in the i-th row, which is placed in a
             column with minimal number of non-zeros and satisfies to
             the stability condition (such element always exists) */
            min_p = min_q = 0; min_len = INT_MAX;
            for (i_ptr = i_beg; i_ptr <= i_end; i_ptr++)
            {  /* get column index of v[i,j] */
                j = sv_ind[i_ptr];
                /* if the j-th column is not shorter than that one, where
                 minimal element is currently placed, skip v[i,j] */
                if (vc_len[j] >= min_len) continue;
                /* if v[i,j] doesn't satisfy to the stability condition,
                 skip it */
                temp = sv_val[i_ptr];
                if (temp < 0.0) temp = - temp;
                if (temp < piv_tol * big) continue;
                /* v[i,j] is better than the current minimal element */
                min_p = i; min_q = j; min_len = vc_len[j];
                /* if Markowitz cost of the current minimal element is
                 not greater than (len-1)**2, it can be chosen right
                 now; this heuristic reduces the search and works well
                 in many cases */
                if (min_len <= len)
                {  p = min_p; q = min_q;
                    return done();
                }
            }
            /* the i-th row has been scanned */
            if (min_p != 0)
            {  /* the minimal element is a next pivot candidate */
                ncand++;
                /* compute its Markowitz cost */
                cost = (len - 1) * (min_len - 1);
                /* choose between the minimal element and the current
                 candidate */
                if (cost < best) {p = min_p; q = min_q; best = cost}
                /* if piv_lim candidates have been considered, there are
                 doubts that a much better candidate exists; therefore
                 it's time to terminate the search */
                if (ncand == piv_lim) return done();
            }
            else
            {  /* this can't be because this can never be */
                xassert(min_p != min_p);
            }
        }
    }
    function done(){
        /* bring the pivot to the factorizing routine */
        callback(p, q);
        return (p == 0);
    }
    return done();
}

function eliminate(luf, p, q){
    var n = luf.n;
    var fc_ptr = luf.fc_ptr;
    var fc_len = luf.fc_len;
    var vr_ptr = luf.vr_ptr;
    var vr_len = luf.vr_len;
    var vr_cap = luf.vr_cap;
    var vr_piv = luf.vr_piv;
    var vc_ptr = luf.vc_ptr;
    var vc_len = luf.vc_len;
    var vc_cap = luf.vc_cap;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var sv_prev = luf.sv_prev;
    var sv_next = luf.sv_next;
    var vr_max = luf.vr_max;
    var rs_head = luf.rs_head;
    var rs_prev = luf.rs_prev;
    var rs_next = luf.rs_next;
    var cs_head = luf.cs_head;
    var cs_prev = luf.cs_prev;
    var cs_next = luf.cs_next;
    var flag = luf.flag;
    var work = luf.work;
    var eps_tol = luf.eps_tol;
    /* at this stage the row-wise representation of the matrix F is
     not used, so fr_len can be used as a working array */
    var ndx = luf.fr_len;
    var ret = 0;
    var len, fill, i, i_beg, i_end, i_ptr, j, j_beg, j_end, j_ptr, k,
        p_beg, p_end, p_ptr, q_beg, q_end, q_ptr;
    var fip, val, vpq, temp;
    xassert(1 <= p && p <= n);
    xassert(1 <= q && q <= n);
    /* remove the p-th (pivot) row from the active set; this row will
     never return there */
    if (rs_prev[p] == 0)
        rs_head[vr_len[p]] = rs_next[p];
    else
        rs_next[rs_prev[p]] = rs_next[p];
    if (rs_next[p] == 0){

    }
    else
        rs_prev[rs_next[p]] = rs_prev[p];
    /* remove the q-th (pivot) column from the active set; this column
     will never return there */
    if (cs_prev[q] == 0)
        cs_head[vc_len[q]] = cs_next[q];
    else
        cs_next[cs_prev[q]] = cs_next[q];
    if (cs_next[q] == 0){

    }
    else
        cs_prev[cs_next[q]] = cs_prev[q];
    /* find the pivot v[p,q] = u[k,k] in the p-th row */
    p_beg = vr_ptr[p];
    p_end = p_beg + vr_len[p] - 1;
    for (p_ptr = p_beg; sv_ind[p_ptr] != q; p_ptr++){/* nop */}
    xassert(p_ptr <= p_end);
    /* store value of the pivot */
    vpq = (vr_piv[p] = sv_val[p_ptr]);
    /* remove the pivot from the p-th row */
    sv_ind[p_ptr] = sv_ind[p_end];
    sv_val[p_ptr] = sv_val[p_end];
    vr_len[p]--;
    p_end--;
    /* find the pivot v[p,q] = u[k,k] in the q-th column */
    q_beg = vc_ptr[q];
    q_end = q_beg + vc_len[q] - 1;
    for (q_ptr = q_beg; sv_ind[q_ptr] != p; q_ptr++){/* nop */}
    xassert(q_ptr <= q_end);
    /* remove the pivot from the q-th column */
    sv_ind[q_ptr] = sv_ind[q_end];
    vc_len[q]--;
    q_end--;
    /* walk through the p-th (pivot) row, which doesn't contain the
     pivot v[p,q] already, and do the following... */
    for (p_ptr = p_beg; p_ptr <= p_end; p_ptr++)
    {  /* get column index of v[p,j] */
        j = sv_ind[p_ptr];
        /* store v[p,j] to the working array */
        flag[j] = 1;
        work[j] = sv_val[p_ptr];
        /* remove the j-th column from the active set; this column will
         return there later with new length */
        if (cs_prev[j] == 0)
            cs_head[vc_len[j]] = cs_next[j];
        else
            cs_next[cs_prev[j]] = cs_next[j];
        if (cs_next[j] == 0){

        }
        else
            cs_prev[cs_next[j]] = cs_prev[j];
        /* find v[p,j] in the j-th column */
        j_beg = vc_ptr[j];
        j_end = j_beg + vc_len[j] - 1;
        for (j_ptr = j_beg; sv_ind[j_ptr] != p; j_ptr++){/* nop */}
        xassert(j_ptr <= j_end);
        /* since v[p,j] leaves the active submatrix, remove it from the
         j-th column; however, v[p,j] is kept in the p-th row */
        sv_ind[j_ptr] = sv_ind[j_end];
        vc_len[j]--;
    }
    /* walk through the q-th (pivot) column, which doesn't contain the
     pivot v[p,q] already, and perform gaussian elimination */
    while (q_beg <= q_end)
    {  /* element v[i,q] should be eliminated */
        /* get row index of v[i,q] */
        i = sv_ind[q_beg];
        /* remove the i-th row from the active set; later this row will
         return there with new length */
        if (rs_prev[i] == 0)
            rs_head[vr_len[i]] = rs_next[i];
        else
            rs_next[rs_prev[i]] = rs_next[i];
        if (rs_next[i] == 0){

        }
        else
            rs_prev[rs_next[i]] = rs_prev[i];
        /* find v[i,q] in the i-th row */
        i_beg = vr_ptr[i];
        i_end = i_beg + vr_len[i] - 1;
        for (i_ptr = i_beg; sv_ind[i_ptr] != q; i_ptr++){/* nop */}
        xassert(i_ptr <= i_end);
        /* compute gaussian multiplier f[i,p] = v[i,q] / v[p,q] */
        fip = sv_val[i_ptr] / vpq;
        /* since v[i,q] should be eliminated, remove it from the i-th
         row */
        sv_ind[i_ptr] = sv_ind[i_end];
        sv_val[i_ptr] = sv_val[i_end];
        vr_len[i]--;
        i_end--;
        /* and from the q-th column */
        sv_ind[q_beg] = sv_ind[q_end];
        vc_len[q]--;
        q_end--;
        /* perform gaussian transformation:
         (i-th row) := (i-th row) - f[i,p] * (p-th row)
         note that now the p-th row, which is in the working array,
         doesn't contain the pivot v[p,q], and the i-th row doesn't
         contain the eliminated element v[i,q] */
        /* walk through the i-th row and transform existing non-zero
         elements */
        fill = vr_len[p];
        for (i_ptr = i_beg; i_ptr <= i_end; i_ptr++)
        {  /* get column index of v[i,j] */
            j = sv_ind[i_ptr];
            /* v[i,j] := v[i,j] - f[i,p] * v[p,j] */
            if (flag[j])
            {  /* v[p,j] != 0 */
                temp = (sv_val[i_ptr] -= fip * work[j]);
                if (temp < 0.0) temp = - temp;
                flag[j] = 0;
                fill--; /* since both v[i,j] and v[p,j] exist */
                if (temp == 0.0 || temp < eps_tol)
                {  /* new v[i,j] is closer to zero; replace it by exact
                 zero, i.e. remove it from the active submatrix */
                    /* remove v[i,j] from the i-th row */
                    sv_ind[i_ptr] = sv_ind[i_end];
                    sv_val[i_ptr] = sv_val[i_end];
                    vr_len[i]--;
                    i_ptr--;
                    i_end--;
                    /* find v[i,j] in the j-th column */
                    j_beg = vc_ptr[j];
                    j_end = j_beg + vc_len[j] - 1;
                    for (j_ptr = j_beg; sv_ind[j_ptr] != i; j_ptr++){}
                    xassert(j_ptr <= j_end);
                    /* remove v[i,j] from the j-th column */
                    sv_ind[j_ptr] = sv_ind[j_end];
                    vc_len[j]--;
                }
                else
                {  /* v_big := max(v_big, |v[i,j]|) */
                    if (luf.big_v < temp) luf.big_v = temp;
                }
            }
        }
        /* now flag is the pattern of the set v[p,*] \ v[i,*], and fill
         is number of non-zeros in this set; therefore up to fill new
         non-zeros may appear in the i-th row */
        if (vr_len[i] + fill > vr_cap[i])
        {  /* enlarge the i-th row */
            if (luf_enlarge_row(luf, i, vr_len[i] + fill))
            {  /* overflow of the sparse vector area */
                ret = 1;
                return ret;
            }
            /* defragmentation may change row and column pointers of the
             matrix V */
            p_beg = vr_ptr[p];
            p_end = p_beg + vr_len[p] - 1;
            q_beg = vc_ptr[q];
            q_end = q_beg + vc_len[q] - 1;
        }
        /* walk through the p-th (pivot) row and create new elements
         of the i-th row that appear due to fill-in; column indices
         of these new elements are accumulated in the array ndx */
        len = 0;
        for (p_ptr = p_beg; p_ptr <= p_end; p_ptr++)
        {  /* get column index of v[p,j], which may cause fill-in */
            j = sv_ind[p_ptr];
            if (flag[j])
            {  /* compute new non-zero v[i,j] = 0 - f[i,p] * v[p,j] */
                temp = (val = - fip * work[j]);
                if (temp < 0.0) temp = - temp;
                if (temp == 0.0 || temp < eps_tol){
                    /* if v[i,j] is closer to zero; just ignore it */
                }
                else
                {  /* add v[i,j] to the i-th row */
                    i_ptr = vr_ptr[i] + vr_len[i];
                    sv_ind[i_ptr] = j;
                    sv_val[i_ptr] = val;
                    vr_len[i]++;
                    /* remember column index of v[i,j] */
                    ndx[++len] = j;
                    /* big_v := max(big_v, |v[i,j]|) */
                    if (luf.big_v < temp) luf.big_v = temp;
                }
            }
            else
            {  /* there is no fill-in, because v[i,j] already exists in
             the i-th row; restore the flag of the element v[p,j],
             which was reset before */
                flag[j] = 1;
            }
        }
        /* add new non-zeros v[i,j] to the corresponding columns */
        for (k = 1; k <= len; k++)
        {  /* get column index of new non-zero v[i,j] */
            j = ndx[k];
            /* one free location is needed in the j-th column */
            if (vc_len[j] + 1 > vc_cap[j])
            {  /* enlarge the j-th column */
                if (luf_enlarge_col(luf, j, vc_len[j] + 10))
                {  /* overflow of the sparse vector area */
                    ret = 1;
                    return ret;
                }
                /* defragmentation may change row and column pointers of
                 the matrix V */
                p_beg = vr_ptr[p];
                p_end = p_beg + vr_len[p] - 1;
                q_beg = vc_ptr[q];
                q_end = q_beg + vc_len[q] - 1;
            }
            /* add new non-zero v[i,j] to the j-th column */
            j_ptr = vc_ptr[j] + vc_len[j];
            sv_ind[j_ptr] = i;
            vc_len[j]++;
        }
        /* now the i-th row has been completely transformed, therefore
         it can return to the active set with new length */
        rs_prev[i] = 0;
        rs_next[i] = rs_head[vr_len[i]];
        if (rs_next[i] != 0) rs_prev[rs_next[i]] = i;
        rs_head[vr_len[i]] = i;
        /* the largest of absolute values of elements in the i-th row
         is currently unknown */
        vr_max[i] = -1.0;
        /* at least one free location is needed to store the gaussian
         multiplier */
        if (luf.sv_end - luf.sv_beg < 1)
        {  /* there are no free locations at all; defragment SVA */
            luf_defrag_sva(luf);
            if (luf.sv_end - luf.sv_beg < 1)
            {  /* overflow of the sparse vector area */
                ret = 1;
                return ret;
            }
            /* defragmentation may change row and column pointers of the
             matrix V */
            p_beg = vr_ptr[p];
            p_end = p_beg + vr_len[p] - 1;
            q_beg = vc_ptr[q];
            q_end = q_beg + vc_len[q] - 1;
        }
        /* add the element f[i,p], which is the gaussian multiplier,
         to the matrix F */
        luf.sv_end--;
        sv_ind[luf.sv_end] = i;
        sv_val[luf.sv_end] = fip;
        fc_len[p]++;
        /* end of elimination loop */
    }
    /* at this point the q-th (pivot) column should be empty */
    xassert(vc_len[q] == 0);
    /* reset capacity of the q-th column */
    vc_cap[q] = 0;
    /* remove node of the q-th column from the addressing list */
    k = n + q;
    if (sv_prev[k] == 0)
        luf.sv_head = sv_next[k];
    else
        sv_next[sv_prev[k]] = sv_next[k];
    if (sv_next[k] == 0)
        luf.sv_tail = sv_prev[k];
    else
        sv_prev[sv_next[k]] = sv_prev[k];
    /* the p-th column of the matrix F has been completely built; set
     its pointer */
    fc_ptr[p] = luf.sv_end;
    /* walk through the p-th (pivot) row and do the following... */
    for (p_ptr = p_beg; p_ptr <= p_end; p_ptr++)
    {  /* get column index of v[p,j] */
        j = sv_ind[p_ptr];
        /* erase v[p,j] from the working array */
        flag[j] = 0;
        work[j] = 0.0;
        /* the j-th column has been completely transformed, therefore
         it can return to the active set with new length; however
         the special case c_prev[j] = c_next[j] = j means that the
         routine find_pivot excluded the j-th column from the active
         set due to Uwe Suhl's rule, and therefore in this case the
         column can return to the active set only if it is a column
         singleton */
        if (!(vc_len[j] != 1 && cs_prev[j] == j && cs_next[j] == j))
        {  cs_prev[j] = 0;
            cs_next[j] = cs_head[vc_len[j]];
            if (cs_next[j] != 0) cs_prev[cs_next[j]] = j;
            cs_head[vc_len[j]] = j;
        }
    }
    /* return to the factorizing routine */
    return ret;
}

function build_v_cols(luf){
    var n = luf.n;
    var vr_ptr = luf.vr_ptr;
    var vr_len = luf.vr_len;
    var vc_ptr = luf.vc_ptr;
    var vc_len = luf.vc_len;
    var vc_cap = luf.vc_cap;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var sv_prev = luf.sv_prev;
    var sv_next = luf.sv_next;
    var ret = 0;
    var i, i_beg, i_end, i_ptr, j, j_ptr, k, nnz;
    /* it is assumed that on entry all columns of the matrix V are
     empty, i.e. vc_len[j] = vc_cap[j] = 0 for all j = 1, ..., n,
     and have been removed from the addressing list */
    /* count non-zeros in columns of the matrix V; count total number
     of non-zeros in this matrix */
    nnz = 0;
    for (i = 1; i <= n; i++)
    {  /* walk through elements of the i-th row and count non-zeros
     in the corresponding columns */
        i_beg = vr_ptr[i];
        i_end = i_beg + vr_len[i] - 1;
        for (i_ptr = i_beg; i_ptr <= i_end; i_ptr++)
            vc_cap[sv_ind[i_ptr]]++;
        /* count total number of non-zeros */
        nnz += vr_len[i];
    }
    /* store total number of non-zeros */
    luf.nnz_v = nnz;
    /* check for free locations */
    if (luf.sv_end - luf.sv_beg < nnz)
    {  /* overflow of the sparse vector area */
        ret = 1;
        return ret;
    }
    /* allocate columns of the matrix V */
    for (j = 1; j <= n; j++)
    {  /* set pointer to the j-th column */
        vc_ptr[j] = luf.sv_beg;
        /* reserve locations for the j-th column */
        luf.sv_beg += vc_cap[j];
    }
    /* build the matrix V in column-wise format using this matrix in
     row-wise format */
    for (i = 1; i <= n; i++)
    {  /* walk through elements of the i-th row */
        i_beg = vr_ptr[i];
        i_end = i_beg + vr_len[i] - 1;
        for (i_ptr = i_beg; i_ptr <= i_end; i_ptr++)
        {  /* get column index */
            j = sv_ind[i_ptr];
            /* store element in the j-th column */
            j_ptr = vc_ptr[j] + vc_len[j];
            sv_ind[j_ptr] = i;
            sv_val[j_ptr] = sv_val[i_ptr];
            /* increase length of the j-th column */
            vc_len[j]++;
        }
    }
    /* now columns are placed in the sparse vector area behind rows
     in the order n+1, n+2, ..., n+n; so insert column nodes in the
     addressing list using this order */
    for (k = n+1; k <= n+n; k++)
    {  sv_prev[k] = k-1;
        sv_next[k] = k+1;
    }
    sv_prev[n+1] = luf.sv_tail;
    sv_next[luf.sv_tail] = n+1;
    sv_next[n+n] = 0;
    luf.sv_tail = n+n;
    /* return to the factorizing routine */
    return ret;
}

function build_f_rows(luf){
    var n = luf.n;
    var fr_ptr = luf.fr_ptr;
    var fr_len = luf.fr_len;
    var fc_ptr = luf.fc_ptr;
    var fc_len = luf.fc_len;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var ret = 0;
    var i, j, j_beg, j_end, j_ptr, ptr, nnz;
    /* clear rows of the matrix F */
    for (i = 1; i <= n; i++) fr_len[i] = 0;
    /* count non-zeros in rows of the matrix F; count total number of
     non-zeros in this matrix */
    nnz = 0;
    for (j = 1; j <= n; j++)
    {  /* walk through elements of the j-th column and count non-zeros
     in the corresponding rows */
        j_beg = fc_ptr[j];
        j_end = j_beg + fc_len[j] - 1;
        for (j_ptr = j_beg; j_ptr <= j_end; j_ptr++)
            fr_len[sv_ind[j_ptr]]++;
        /* increase total number of non-zeros */
        nnz += fc_len[j];
    }
    /* store total number of non-zeros */
    luf.nnz_f = nnz;
    /* check for free locations */
    if (luf.sv_end - luf.sv_beg < nnz)
    {  /* overflow of the sparse vector area */
        ret = 1;
        return ret;
    }
    /* allocate rows of the matrix F */
    for (i = 1; i <= n; i++)
    {  /* set pointer to the end of the i-th row; later this pointer
     will be set to the beginning of the i-th row */
        fr_ptr[i] = luf.sv_end;
        /* reserve locations for the i-th row */
        luf.sv_end -= fr_len[i];
    }
    /* build the matrix F in row-wise format using this matrix in
     column-wise format */
    for (j = 1; j <= n; j++)
    {  /* walk through elements of the j-th column */
        j_beg = fc_ptr[j];
        j_end = j_beg + fc_len[j] - 1;
        for (j_ptr = j_beg; j_ptr <= j_end; j_ptr++)
        {  /* get row index */
            i = sv_ind[j_ptr];
            /* store element in the i-th row */
            ptr = --fr_ptr[i];
            sv_ind[ptr] = j;
            sv_val[ptr] = sv_val[j_ptr];
        }
    }
    /* return to the factorizing routine */
    return ret;
}

function luf_factorize(luf, n, col, info){
    var pp_row, pp_col, qq_row, qq_col;
    var max_gro = luf.max_gro;
    var i, j, k, p, q, t, ret = null;
    if (n < 1)
        xerror("luf_factorize: n = " + n + "; invalid parameter");
    if (n > N_MAX)
        xerror("luf_factorize: n = " + n + "; matrix too big");
    /* invalidate the factorization */
    luf.valid = 0;
    /* reallocate arrays, if necessary */
    reallocate(luf, n);
    pp_row = luf.pp_row;
    pp_col = luf.pp_col;
    qq_row = luf.qq_row;
    qq_col = luf.qq_col;
    /* estimate initial size of the SVA, if not specified */
    if (luf.sv_size == 0 && luf.new_sva == 0)
        luf.new_sva = 5 * (n + 10);


    function more(){
        /* reallocate the sparse vector area, if required */
        if (luf.new_sva > 0)
        {   luf.sv_size = luf.new_sva;
            luf.sv_ind = new Array(1+luf.sv_size);
            luf.sv_val = new Array(1+luf.sv_size);
            luf.new_sva = 0;
        }
        /* initialize LU-factorization data structures */
        if (initialize(luf, col, info))
        {  /* overflow of the sparse vector area */
            luf.new_sva = luf.sv_size + luf.sv_size;
            xassert(luf.new_sva > luf.sv_size);
            return true;
        }
        /* main elimination loop */
        for (k = 1; k <= n; k++)
        {  /* choose a pivot element v[p,q] */
            if (find_pivot(luf, function(_p, _q){p = _p; q = _q}))
            {  /* no pivot can be chosen, because the active submatrix is
             exactly zero */
                luf.rank = k - 1;
                ret = LUF_ESING;
                return false;
            }
            /* let v[p,q] correspond to u[i',j']; permute k-th and i'-th
             rows and k-th and j'-th columns of the matrix U = P*V*Q to
             move the element u[i',j'] to the position u[k,k] */
            i = pp_col[p]; j = qq_row[q];
            xassert(k <= i && i <= n && k <= j && j <= n);
            /* permute k-th and i-th rows of the matrix U */
            t = pp_row[k];
            pp_row[i] = t; pp_col[t] = i;
            pp_row[k] = p; pp_col[p] = k;
            /* permute k-th and j-th columns of the matrix U */
            t = qq_col[k];
            qq_col[j] = t; qq_row[t] = j;
            qq_col[k] = q; qq_row[q] = k;
            /* eliminate subdiagonal elements of k-th column of the matrix
             U = P*V*Q using the pivot element u[k,k] = v[p,q] */
            if (eliminate(luf, p, q))
            {  /* overflow of the sparse vector area */
                luf.new_sva = luf.sv_size + luf.sv_size;
                xassert(luf.new_sva > luf.sv_size);
                return true;
            }
            /* check relative growth of elements of the matrix V */
            if (luf.big_v > max_gro * luf.max_a)
            {  /* the growth is too intensive, therefore most probably the
             matrix A is ill-conditioned */
                luf.rank = k - 1;
                ret = LUF_ECOND;
                return false;
            }
        }
        /* now the matrix U = P*V*Q is upper triangular, the matrix V has
         been built in row-wise format, and the matrix F has been built
         in column-wise format */
        /* defragment the sparse vector area in order to merge all free
         locations in one continuous extent */
        luf_defrag_sva(luf);
        /* build the matrix V in column-wise format */
        if (build_v_cols(luf))
        {  /* overflow of the sparse vector area */
            luf.new_sva = luf.sv_size + luf.sv_size;
            xassert(luf.new_sva > luf.sv_size);
            return true;
        }
        /* build the matrix F in row-wise format */
        if (build_f_rows(luf))
        {  /* overflow of the sparse vector area */
            luf.new_sva = luf.sv_size + luf.sv_size;
            xassert(luf.new_sva > luf.sv_size);
            return true;
        }
        return false;
    }

    while (more()){}
    if (ret != null)
        return ret;

    /* the LU-factorization has been successfully computed */
    luf.valid = 1;
    luf.rank = n;
    ret = 0;
    /* if there are few free locations in the sparse vector area, try
     increasing its size in the future */
    t = 3 * (n + luf.nnz_v) + 2 * luf.nnz_f;
    if (luf.sv_size < t)
    {  luf.new_sva = luf.sv_size;
        while (luf.new_sva < t)
        {  k = luf.new_sva;
            luf.new_sva = k + k;
            xassert(luf.new_sva > k);
        }
    }
    /* return to the calling program */
    return ret;
}

function luf_f_solve(luf, tr, x){
    var n = luf.n;
    var fr_ptr = luf.fr_ptr;
    var fr_len = luf.fr_len;
    var fc_ptr = luf.fc_ptr;
    var fc_len = luf.fc_len;
    var pp_row = luf.pp_row;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var i, j, k, beg, end, ptr;
    var xk;
    if (!luf.valid)
        xerror("luf_f_solve: LU-factorization is not valid");
    if (!tr)
    {  /* solve the system F*x = b */
        for (j = 1; j <= n; j++)
        {  k = pp_row[j];
            xk = x[k];
            if (xk != 0.0)
            {  beg = fc_ptr[k];
                end = beg + fc_len[k] - 1;
                for (ptr = beg; ptr <= end; ptr++)
                    x[sv_ind[ptr]] -= sv_val[ptr] * xk;
            }
        }
    }
    else
    {  /* solve the system F'*x = b */
        for (i = n; i >= 1; i--)
        {  k = pp_row[i];
            xk = x[k];
            if (xk != 0.0)
            {  beg = fr_ptr[k];
                end = beg + fr_len[k] - 1;
                for (ptr = beg; ptr <= end; ptr++)
                    x[sv_ind[ptr]] -= sv_val[ptr] * xk;
            }
        }
    }
}

function luf_v_solve(luf, tr, x){
    var n = luf.n;
    var vr_ptr = luf.vr_ptr;
    var vr_len = luf.vr_len;
    var vr_piv = luf.vr_piv;
    var vc_ptr = luf.vc_ptr;
    var vc_len = luf.vc_len;
    var pp_row = luf.pp_row;
    var qq_col = luf.qq_col;
    var sv_ind = luf.sv_ind;
    var sv_val = luf.sv_val;
    var b = luf.work;
    var i, j, k, beg, end, ptr;
    var temp;
    if (!luf.valid)
        xerror("luf_v_solve: LU-factorization is not valid");
    for (k = 1; k <= n; k++){b[k] = x[k]; x[k] = 0.0}
    if (!tr)
    {  /* solve the system V*x = b */
        for (k = n; k >= 1; k--)
        {  i = pp_row[k]; j = qq_col[k];
            temp = b[i];
            if (temp != 0.0)
            {  x[j] = (temp /= vr_piv[i]);
                beg = vc_ptr[j];
                end = beg + vc_len[j] - 1;
                for (ptr = beg; ptr <= end; ptr++)
                    b[sv_ind[ptr]] -= sv_val[ptr] * temp;
            }
        }
    }
    else
    {  /* solve the system V'*x = b */
        for (k = 1; k <= n; k++)
        {  i = pp_row[k]; j = qq_col[k];
            temp = b[j];
            if (temp != 0.0)
            {  x[i] = (temp /= vr_piv[i]);
                beg = vr_ptr[i];
                end = beg + vr_len[i] - 1;
                for (ptr = beg; ptr <= end; ptr++)
                    b[sv_ind[ptr]] -= sv_val[ptr] * temp;
            }
        }
    }
}

function luf_a_solve(luf, tr, x){
    if (!luf.valid)
        xerror("luf_a_solve: LU-factorization is not valid");
    if (!tr)
    {  /* A = F*V, therefore inv(A) = inv(V)*inv(F) */
        luf_f_solve(luf, 0, x);
        luf_v_solve(luf, 0, x);
    }
    else
    {  /* A' = V'*F', therefore inv(A') = inv(F')*inv(V') */
        luf_v_solve(luf, 1, x);
        luf_f_solve(luf, 1, x);
    }
}

function npp_error(){

}

function npp_create_wksp(){
    /* create LP/MIP preprocessor workspace */
    var npp = {};
    npp.orig_dir = 0;
    npp.orig_m = npp.orig_n = npp.orig_nnz = 0;
    npp.name = npp.obj = null;
    npp.c0 = 0.0;
    npp.nrows = npp.ncols = 0;
    npp.r_head = npp.r_tail = null;
    npp.c_head = npp.c_tail = null;
    npp.top = null;
    npp.m = npp.n = npp.nnz = 0;
    npp.row_ref = npp.col_ref = null;
    npp.sol = npp.scaling = 0;
    npp.p_stat = npp.d_stat = npp.t_stat = npp.i_stat = 0;
    npp.r_stat = null;
    /*npp.r_prim =*/ npp.r_pi = null;
    npp.c_stat = null;
    npp.c_value = /*npp.c_dual =*/ null;
    return npp;
}

function npp_insert_row(npp, row, where){
    /* insert row to the row list */
    if (where == 0)
    {  /* insert row to the beginning of the row list */
        row.prev = null;
        row.next = npp.r_head;
        if (row.next == null)
            npp.r_tail = row;
        else
            row.next.prev = row;
        npp.r_head = row;
    }
    else
    {  /* insert row to the end of the row list */
        row.prev = npp.r_tail;
        row.next = null;
        if (row.prev == null)
            npp.r_head = row;
        else
            row.prev.next = row;
        npp.r_tail = row;
    }
}

function npp_remove_row(npp, row){
    /* remove row from the row list */
    if (row.prev == null)
        npp.r_head = row.next;
    else
        row.prev.next = row.next;
    if (row.next == null)
        npp.r_tail = row.prev;
    else
        row.next.prev = row.prev;
}

function npp_activate_row(npp, row){
    /* make row active */
    if (!row.temp)
    {  row.temp = 1;
        /* move the row to the beginning of the row list */
        npp_remove_row(npp, row);
        npp_insert_row(npp, row, 0);
    }
}

function npp_deactivate_row(npp, row){
    /* make row inactive */
    if (row.temp)
    {  row.temp = 0;
        /* move the row to the end of the row list */
        npp_remove_row(npp, row);
        npp_insert_row(npp, row, 1);
    }
}

function npp_insert_col(npp, col, where){
    /* insert column to the column list */
    if (where == 0)
    {  /* insert column to the beginning of the column list */
        col.prev = null;
        col.next = npp.c_head;
        if (col.next == null)
            npp.c_tail = col;
        else
            col.next.prev = col;
        npp.c_head = col;
    }
    else
    {  /* insert column to the end of the column list */
        col.prev = npp.c_tail;
        col.next = null;
        if (col.prev == null)
            npp.c_head = col;
        else
            col.prev.next = col;
        npp.c_tail = col;
    }
}

function npp_remove_col(npp, col){
    /* remove column from the column list */
    if (col.prev == null)
        npp.c_head = col.next;
    else
        col.prev.next = col.next;
    if (col.next == null)
        npp.c_tail = col.prev;
    else
        col.next.prev = col.prev;
}

function npp_activate_col(npp, col){
    /* make column active */
    if (!col.temp)
    {  col.temp = 1;
        /* move the column to the beginning of the column list */
        npp_remove_col(npp, col);
        npp_insert_col(npp, col, 0);
    }
}

function npp_deactivate_col(npp, col){
    /* make column inactive */
    if (col.temp)
    {  col.temp = 0;
        /* move the column to the end of the column list */
        npp_remove_col(npp, col);
        npp_insert_col(npp, col, 1);
    }
}

function npp_add_row(npp){
    /* add new row to the current problem */
    var row = {};
    row.i = ++(npp.nrows);
    row.name = null;
    row.lb = -DBL_MAX;
    row.ub = +DBL_MAX;
    row.ptr = null;
    row.temp = 0;
    npp_insert_row(npp, row, 1);
    return row;
}

function npp_add_col(npp){
    /* add new column to the current problem */
    var col = {};
    col.j = ++(npp.ncols);
    col.name = null;
    col.is_int = 0;
    col.lb = col.ub = col.coef = 0.0;
    col.ptr = null;
    col.temp = 0;
    npp_insert_col(npp, col, 1);
    return col;
}

function npp_add_aij(row, col, val){
    /* add new element to the constraint matrix */
    var aij = {};
    aij.row = row;
    aij.col = col;
    aij.val = val;
    aij.r_prev = null;
    aij.r_next = row.ptr;
    aij.c_prev = null;
    aij.c_next = col.ptr;
    if (aij.r_next != null)
        aij.r_next.r_prev = aij;
    if (aij.c_next != null)
        aij.c_next.c_prev = aij;
    row.ptr = col.ptr = aij;
    return aij;
}

function npp_row_nnz(row){
    /* count number of non-zero coefficients in row */
    var nnz = 0;
    for (var aij = row.ptr; aij != null; aij = aij.r_next)
        nnz++;
    return nnz;
}

function npp_col_nnz(col){
    /* count number of non-zero coefficients in column */
    var nnz = 0;
    for (var aij = col.ptr; aij != null; aij = aij.c_next)
        nnz++;
    return nnz;
}

function npp_push_tse(npp, func){
    /* push new entry to the transformation stack */
    var tse;
    tse = {};
    tse.func = func;
    tse.info = {};
    tse.link = npp.top;
    npp.top = tse;
    return tse.info;
}

function npp_erase_row(row){
    /* erase row content to make it empty */
    var aij;
    while (row.ptr != null)
    {  aij = row.ptr;
        row.ptr = aij.r_next;
        if (aij.c_prev == null)
            aij.col.ptr = aij.c_next;
        else
            aij.c_prev.c_next = aij.c_next;
        if (aij.c_next != null)
            aij.c_next.c_prev = aij.c_prev;
    }
}

function npp_del_row(npp, row){
    /* remove row from the current problem */
    npp_erase_row(row);
    npp_remove_row(npp, row);
}

function npp_del_col(npp, col){
    /* remove column from the current problem */
    var aij;
    while (col.ptr != null)
    {  aij = col.ptr;
        col.ptr = aij.c_next;
        if (aij.r_prev == null)
            aij.row.ptr = aij.r_next;
        else
            aij.r_prev.r_next = aij.r_next;
        if (aij.r_next != null)
            aij.r_next.r_prev = aij.r_prev;
    }
    npp_remove_col(npp, col);
}

function npp_del_aij(aij){
    /* remove element from the constraint matrix */
    if (aij.r_prev == null)
        aij.row.ptr = aij.r_next;
    else
        aij.r_prev.r_next = aij.r_next;
    if (aij.r_next != null)
        aij.r_next.r_prev = aij.r_prev;
    if (aij.c_prev == null)
        aij.col.ptr = aij.c_next;
    else
        aij.c_prev.c_next = aij.c_next;
    if (aij.c_next != null)
        aij.c_next.c_prev = aij.c_prev;
}

function npp_load_prob(npp, orig, names, sol, scaling){
    /* load original problem into the preprocessor workspace */
    var m = orig.m;
    var n = orig.n;
    var link;
    var i, j;
    var dir;
    xassert(names == GLP_OFF || names == GLP_ON);
    xassert(sol == GLP_SOL || sol == GLP_IPT || sol == GLP_MIP);
    xassert(scaling == GLP_OFF || scaling == GLP_ON);
    if (sol == GLP_MIP) xassert(!scaling);
    npp.orig_dir = orig.dir;
    if (npp.orig_dir == GLP_MIN)
        dir = +1.0;
    else if (npp.orig_dir == GLP_MAX)
        dir = -1.0;
    else
        xassert(npp != npp);
    npp.orig_m = m;
    npp.orig_n = n;
    npp.orig_nnz = orig.nnz;
    if (names && orig.name != null)
        npp.name = orig.name;
    if (names && orig.obj != null)
        npp.obj = orig.obj;
    npp.c0 = dir * orig.c0;
    /* load rows */
    link = new Array(1+m);
    for (i = 1; i <= m; i++)
    {  var rrr = orig.row[i];
        var row;
        link[i] = row = npp_add_row(npp);
        xassert(row.i == i);
        if (names && rrr.name != null)
            row.name = rrr.name;
        if (!scaling)
        {  if (rrr.type == GLP_FR){
            row.lb = -DBL_MAX; row.ub = +DBL_MAX;
        }
        else if (rrr.type == GLP_LO){
            row.lb = rrr.lb; row.ub = +DBL_MAX;
        }
        else if (rrr.type == GLP_UP){
            row.lb = -DBL_MAX; row.ub = rrr.ub;
        }
        else if (rrr.type == GLP_DB){
            row.lb = rrr.lb; row.ub = rrr.ub;
        }
        else if (rrr.type == GLP_FX)
            row.lb = row.ub = rrr.lb;
        else
            xassert(rrr != rrr);
        }
        else
        {  var rii = rrr.rii;
            if (rrr.type == GLP_FR){
                row.lb = -DBL_MAX; row.ub = +DBL_MAX;
            }
            else if (rrr.type == GLP_LO){
                row.lb = rrr.lb * rii; row.ub = +DBL_MAX;
            }
            else if (rrr.type == GLP_UP){
                row.lb = -DBL_MAX; row.ub = rrr.ub * rii;
            }
            else if (rrr.type == GLP_DB){
                row.lb = rrr.lb * rii; row.ub = rrr.ub * rii;
            }
            else if (rrr.type == GLP_FX)
                row.lb = row.ub = rrr.lb * rii;
            else
                xassert(rrr != rrr);
        }
    }
    /* load columns and constraint coefficients */
    for (j = 1; j <= n; j++)
    {  var ccc = orig.col[j];
        var aaa;
        var col;
        col = npp_add_col(npp);
        xassert(col.j == j);
        if (names && ccc.name != null)
            col.name =  ccc.name;
        if (sol == GLP_MIP)
            col.is_int = Number(ccc.kind == GLP_IV);
        if (!scaling){
            if (ccc.type == GLP_FR){
                col.lb = -DBL_MAX; col.ub = +DBL_MAX;
            }
            else if (ccc.type == GLP_LO){
                col.lb = ccc.lb; col.ub = +DBL_MAX;
            }
            else if (ccc.type == GLP_UP){
                col.lb = -DBL_MAX; col.ub = ccc.ub;
            }
            else if (ccc.type == GLP_DB){
                col.lb = ccc.lb; col.ub = ccc.ub;
            }
            else if (ccc.type == GLP_FX)
                col.lb = col.ub = ccc.lb;
            else
                xassert(ccc != ccc);
            col.coef = dir * ccc.coef;
            for (aaa = ccc.ptr; aaa != null; aaa = aaa.c_next)
                npp_add_aij(link[aaa.row.i], col, aaa.val);
        }
        else
        {  var sjj = ccc.sjj;
            if (ccc.type == GLP_FR){
                col.lb = -DBL_MAX; col.ub = +DBL_MAX;
            }
            else if (ccc.type == GLP_LO){
                col.lb = ccc.lb / sjj; col.ub = +DBL_MAX;
            }
            else if (ccc.type == GLP_UP){
                col.lb = -DBL_MAX; col.ub = ccc.ub / sjj;
            }
            else if (ccc.type == GLP_DB){
                col.lb = ccc.lb / sjj; col.ub = ccc.ub / sjj;
            }
            else if (ccc.type == GLP_FX)
                col.lb = col.ub = ccc.lb / sjj;
            else
                xassert(ccc != ccc);
            col.coef = dir * ccc.coef * sjj;
            for (aaa = ccc.ptr; aaa != null; aaa = aaa.c_next)
                npp_add_aij(link[aaa.row.i], col,
                    aaa.row.rii * aaa.val * sjj);
        }
    }
    /* keep solution indicator and scaling option */
    npp.sol = sol;
    npp.scaling = scaling;
}

function npp_build_prob(npp, prob){
    /* build resultant (preprocessed) problem */
    var row;
    var col;
    var aij;
    var i, j, type, len, ind;
    var dir, val;
    glp_erase_prob(prob);
    glp_set_prob_name(prob, npp.name);
    glp_set_obj_name(prob, npp.obj);
    glp_set_obj_dir(prob, npp.orig_dir);
    if (npp.orig_dir == GLP_MIN)
        dir = +1.0;
    else if (npp.orig_dir == GLP_MAX)
        dir = -1.0;
    else
        xassert(npp != npp);
    glp_set_obj_coef(prob, 0, dir * npp.c0);
    /* build rows */
    for (row = npp.r_head; row != null; row = row.next)
    {  row.temp = i = glp_add_rows(prob, 1);
        glp_set_row_name(prob, i, row.name);
        if (row.lb == -DBL_MAX && row.ub == +DBL_MAX)
            type = GLP_FR;
        else if (row.ub == +DBL_MAX)
            type = GLP_LO;
        else if (row.lb == -DBL_MAX)
            type = GLP_UP;
        else if (row.lb != row.ub)
            type = GLP_DB;
        else
            type = GLP_FX;
        glp_set_row_bnds(prob, i, type, row.lb, row.ub);
    }
    /* build columns and the constraint matrix */
    ind = new Array(1+prob.m);
    val = new Array(1+prob.m);
    for (col = npp.c_head; col != null; col = col.next)
    {  j = glp_add_cols(prob, 1);
        glp_set_col_name(prob, j, col.name);
        glp_set_col_kind(prob, j, col.is_int ? GLP_IV : GLP_CV);
        if (col.lb == -DBL_MAX && col.ub == +DBL_MAX)
            type = GLP_FR;
        else if (col.ub == +DBL_MAX)
            type = GLP_LO;
        else if (col.lb == -DBL_MAX)
            type = GLP_UP;
        else if (col.lb != col.ub)
            type = GLP_DB;
        else
            type = GLP_FX;
        glp_set_col_bnds(prob, j, type, col.lb, col.ub);
        glp_set_obj_coef(prob, j, dir * col.coef);
        len = 0;
        for (aij = col.ptr; aij != null; aij = aij.c_next)
        {  len++;
            ind[len] = aij.row.temp;
            val[len] = aij.val;
        }
        glp_set_mat_col(prob, j, len, ind, val);
    }
    /* resultant problem has been built */
    npp.m = prob.m;
    npp.n = prob.n;
    npp.nnz = prob.nnz;
    npp.row_ref = new Array(1+npp.m);
    npp.col_ref = new Array(1+npp.n);
    for (row = npp.r_head, i = 0; row != null; row = row.next)
        npp.row_ref[++i] = row.i;
    for (col = npp.c_head, j = 0; col != null; col = col.next)
        npp.col_ref[++j] = col.j;
    /* transformed problem segment is no longer needed */
    npp.name = npp.obj = null;
    npp.c0 = 0.0;
    npp.r_head = npp.r_tail = null;
    npp.c_head = npp.c_tail = null;
}

function npp_postprocess(npp, prob){
    /* postprocess solution from the resultant problem */
    var row;
    var col;
    var tse;
    var i, j, k;
    var dir;
    xassert(npp.orig_dir == prob.dir);
    if (npp.orig_dir == GLP_MIN)
        dir = +1.0;
    else if (npp.orig_dir == GLP_MAX)
        dir = -1.0;
    else
        xassert(npp != npp);
    xassert(npp.m == prob.m);
    xassert(npp.n == prob.n);
    xassert(npp.nnz == prob.nnz);
    /* copy solution status */
    if (npp.sol == GLP_SOL)
    {  npp.p_stat = prob.pbs_stat;
        npp.d_stat = prob.dbs_stat;
    }
    else if (npp.sol == GLP_IPT)
        npp.t_stat = prob.ipt_stat;
    else if (npp.sol == GLP_MIP)
        npp.i_stat = prob.mip_stat;
    else
        xassert(npp != npp);
    /* allocate solution arrays */
    if (npp.sol == GLP_SOL)
    {  if (npp.r_stat == null)
        npp.r_stat = new Array(1+npp.nrows);
        for (i = 1; i <= npp.nrows; i++)
            npp.r_stat[i] = 0;
        if (npp.c_stat == null)
            npp.c_stat = new Array(1+npp.ncols);
        for (j = 1; j <= npp.ncols; j++)
            npp.c_stat[j] = 0;
    }
    if (npp.c_value == null)
        npp.c_value = new Array(1+npp.ncols);
    for (j = 1; j <= npp.ncols; j++)
        npp.c_value[j] = DBL_MAX;
    if (npp.sol != GLP_MIP)
    {  if (npp.r_pi == null)
        npp.r_pi = new Array(1+npp.nrows);
        for (i = 1; i <= npp.nrows; i++)
            npp.r_pi[i] = DBL_MAX;
    }
    /* copy solution components from the resultant problem */
    if (npp.sol == GLP_SOL)
    {  for (i = 1; i <= npp.m; i++)
    {  row = prob.row[i];
        k = npp.row_ref[i];
        npp.r_stat[k] = row.stat;
        /*npp.r_prim[k] = row.prim;*/
        npp.r_pi[k] = dir * row.dual;
    }
        for (j = 1; j <= npp.n; j++)
        {  col = prob.col[j];
            k = npp.col_ref[j];
            npp.c_stat[k] = col.stat;
            npp.c_value[k] = col.prim;
            /*npp.c_dual[k] = dir * col.dual;*/
        }
    }
    else if (npp.sol == GLP_IPT)
    {  for (i = 1; i <= npp.m; i++)
    {  row = prob.row[i];
        k = npp.row_ref[i];
        /*npp.r_prim[k] = row.pval;*/
        npp.r_pi[k] = dir * row.dval;
    }
        for (j = 1; j <= npp.n; j++)
        {  col = prob.col[j];
            k = npp.col_ref[j];
            npp.c_value[k] = col.pval;
            /*npp.c_dual[k] = dir * col.dval;*/
        }
    }
    else if (npp.sol == GLP_MIP)
    {
        for (j = 1; j <= npp.n; j++)
        {  col = prob.col[j];
            k = npp.col_ref[j];
            npp.c_value[k] = col.mipx;
        }
    }
    else
        xassert(npp != npp);
    /* perform postprocessing to construct solution to the original
     problem */
    for (tse = npp.top; tse != null; tse = tse.link)
    {  xassert(tse.func != null);
        xassert(tse.func(npp, tse.info) == 0);
    }
}

function npp_unload_sol(npp, orig){
    /* store solution to the original problem */
    var row;
    var col;
    var i, j;
    var dir;
    var aij, temp;
    xassert(npp.orig_dir == orig.dir);
    if (npp.orig_dir == GLP_MIN)
        dir = +1.0;
    else if (npp.orig_dir == GLP_MAX)
        dir = -1.0;
    else
        xassert(npp != npp);
    xassert(npp.orig_m == orig.m);
    xassert(npp.orig_n == orig.n);
    xassert(npp.orig_nnz == orig.nnz);
    if (npp.sol == GLP_SOL)
    {  /* store basic solution */
        orig.valid = 0;
        orig.pbs_stat = npp.p_stat;
        orig.dbs_stat = npp.d_stat;
        orig.obj_val = orig.c0;
        orig.some = 0;
        for (i = 1; i <= orig.m; i++)
        {  row = orig.row[i];
            row.stat = npp.r_stat[i];
            if (!npp.scaling)
            {  /*row.prim = npp.r_prim[i];*/
                row.dual = dir * npp.r_pi[i];
            }
            else
            {  /*row.prim = npp.r_prim[i] / row.rii;*/
                row.dual = dir * npp.r_pi[i] * row.rii;
            }
            if (row.stat == GLP_BS)
                row.dual = 0.0;
            else if (row.stat == GLP_NL)
            {  xassert(row.type == GLP_LO || row.type == GLP_DB);
                row.prim = row.lb;
            }
            else if (row.stat == GLP_NU)
            {  xassert(row.type == GLP_UP || row.type == GLP_DB);
                row.prim = row.ub;
            }
            else if (row.stat == GLP_NF)
            {  xassert(row.type == GLP_FR);
                row.prim = 0.0;
            }
            else if (row.stat == GLP_NS)
            {  xassert(row.type == GLP_FX);
                row.prim = row.lb;
            }
            else
                xassert(row != row);
        }
        for (j = 1; j <= orig.n; j++)
        {  col = orig.col[j];
            col.stat = npp.c_stat[j];
            if (!npp.scaling)
            {  col.prim = npp.c_value[j];
                /*col.dual = dir * npp.c_dual[j];*/
            }
            else
            {  col.prim = npp.c_value[j] * col.sjj;
                /*col.dual = dir * npp.c_dual[j] / col.sjj;*/
            }
            if (col.stat == GLP_BS)
                col.dual = 0.0;
            else if (col.stat == GLP_NL)
            {  xassert(col.type == GLP_LO || col.type == GLP_DB);
                col.prim = col.lb;
            }
            else if (col.stat == GLP_NU)
            {  xassert(col.type == GLP_UP || col.type == GLP_DB);
                col.prim = col.ub;
            }
            else if (col.stat == GLP_NF)
            {  xassert(col.type == GLP_FR);
                col.prim = 0.0;
            }
            else if (col.stat == GLP_NS)
            {  xassert(col.type == GLP_FX);
                col.prim = col.lb;
            }
            else
                xassert(col != col);
            orig.obj_val += col.coef * col.prim;
        }
        /* compute primal values of inactive rows */
        for (i = 1; i <= orig.m; i++)
        {  row = orig.row[i];
            if (row.stat == GLP_BS)
            {
                temp = 0.0;
                for (aij = row.ptr; aij != null; aij = aij.r_next)
                    temp += aij.val * aij.col.prim;
                row.prim = temp;
            }
        }
        /* compute reduced costs of active columns */
        for (j = 1; j <= orig.n; j++)
        {  col = orig.col[j];
            if (col.stat != GLP_BS)
            {
                temp = col.coef;
                for (aij = col.ptr; aij != null; aij = aij.c_next)
                    temp -= aij.val * aij.row.dual;
                col.dual = temp;
            }
        }
    }
    else if (npp.sol == GLP_IPT)
    {  /* store interior-point solution */
        orig.ipt_stat = npp.t_stat;
        orig.ipt_obj = orig.c0;
        for (i = 1; i <= orig.m; i++)
        {  row = orig.row[i];
            if (!npp.scaling)
            {  /*row.pval = npp.r_prim[i];*/
                row.dval = dir * npp.r_pi[i];
            }
            else
            {  /*row.pval = npp.r_prim[i] / row.rii;*/
                row.dval = dir * npp.r_pi[i] * row.rii;
            }
        }
        for (j = 1; j <= orig.n; j++)
        {  col = orig.col[j];
            if (!npp.scaling)
            {  col.pval = npp.c_value[j];
                /*col.dval = dir * npp.c_dual[j];*/
            }
            else
            {  col.pval = npp.c_value[j] * col.sjj;
                /*col.dval = dir * npp.c_dual[j] / col.sjj;*/
            }
            orig.ipt_obj += col.coef * col.pval;
        }
        /* compute row primal values */
        for (i = 1; i <= orig.m; i++)
        {  row = orig.row[i];
            {
                temp = 0.0;
                for (aij = row.ptr; aij != null; aij = aij.r_next)
                    temp += aij.val * aij.col.pval;
                row.pval = temp;
            }
        }
        /* compute column dual values */
        for (j = 1; j <= orig.n; j++)
        {  col = orig.col[j];
            {
                temp = col.coef;
                for (aij = col.ptr; aij != null; aij = aij.c_next)
                    temp -= aij.val * aij.row.dval;
                col.dval = temp;
            }
        }
    }
    else if (npp.sol == GLP_MIP)
    {  /* store MIP solution */
        xassert(!npp.scaling);
        orig.mip_stat = npp.i_stat;
        orig.mip_obj = orig.c0;
        for (j = 1; j <= orig.n; j++)
        {  col = orig.col[j];
            col.mipx = npp.c_value[j];
            if (col.kind == GLP_IV)
                xassert(col.mipx == Math.floor(col.mipx));
            orig.mip_obj += col.coef * col.mipx;
        }
        /* compute row primal values */
        for (i = 1; i <= orig.m; i++)
        {  row = orig.row[i];
            {
                temp = 0.0;
                for (aij = row.ptr; aij != null; aij = aij.r_next)
                    temp += aij.val * aij.col.mipx;
                row.mipx = temp;
            }
        }
    }
    else
        xassert(npp != npp);
}

function npp_free_row(npp, p){
    /* process free (unbounded) row */
    var info;
    /* the row must be free */
    xassert(p.lb == -DBL_MAX && p.ub == +DBL_MAX);
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover free (unbounded) row */
            if (npp.sol == GLP_SOL)
                npp.r_stat[info.p] = GLP_BS;
            if (npp.sol != GLP_MIP)
                npp.r_pi[info.p] = 0.0;
            return 0;
        }
    );
    info.p = p.i;
    /* remove the row from the problem */
    npp_del_row(npp, p);
}

function npp_geq_row(npp, p){
    /* process row of 'not less than' type */
    var info;
    var s;
    /* the row must have lower bound */
    xassert(p.lb != -DBL_MAX);
    xassert(p.lb < p.ub);
    /* create column for surplus variable */
    s = npp_add_col(npp);
    s.lb = 0.0;
    s.ub = (p.ub == +DBL_MAX ? +DBL_MAX : p.ub - p.lb);
    /* and add it to the transformed problem */
    npp_add_aij(p, s, -1.0);
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function rcv_geq_row(npp, info){
            /* recover row of 'not less than' type */
            if (npp.sol == GLP_SOL)
            {  if (npp.r_stat[info.p] == GLP_BS)
            {  if (npp.c_stat[info.s] == GLP_BS)
            {  npp_error();
                return 1;
            }
            else if (npp.c_stat[info.s] == GLP_NL ||
                npp.c_stat[info.s] == GLP_NU)
                npp.r_stat[info.p] = GLP_BS;
            else
            {  npp_error();
                return 1;
            }
            }
            else if (npp.r_stat[info.p] == GLP_NS)
            {  if (npp.c_stat[info.s] == GLP_BS)
                npp.r_stat[info.p] = GLP_BS;
            else if (npp.c_stat[info.s] == GLP_NL)
                npp.r_stat[info.p] = GLP_NL;
            else if (npp.c_stat[info.s] == GLP_NU)
                npp.r_stat[info.p] = GLP_NU;
            else
            {  npp_error();
                return 1;
            }
            }
            else
            {  npp_error();
                return 1;
            }
            }
            return 0;
        }
    );
    info.p = p.i;
    info.s = s.j;
    /* replace the row by equality constraint */
    p.ub = p.lb;
}

function npp_leq_row(npp, p){
    /* process row of 'not greater than' type */
    var info;
    var s;
    /* the row must have upper bound */
    xassert(p.ub != +DBL_MAX);
    xassert(p.lb < p.ub);
    /* create column for slack variable */
    s = npp_add_col(npp);
    s.lb = 0.0;
    s.ub = (p.lb == -DBL_MAX ? +DBL_MAX : p.ub - p.lb);
    /* and add it to the transformed problem */
    npp_add_aij(p, s, +1.0);
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover row of 'not greater than' type */
            if (npp.sol == GLP_SOL)
            {  if (npp.r_stat[info.p] == GLP_BS)
            {  if (npp.c_stat[info.s] == GLP_BS)
            {  npp_error();
                return 1;
            }
            else if (npp.c_stat[info.s] == GLP_NL ||
                npp.c_stat[info.s] == GLP_NU)
                npp.r_stat[info.p] = GLP_BS;
            else
            {  npp_error();
                return 1;
            }
            }
            else if (npp.r_stat[info.p] == GLP_NS)
            {  if (npp.c_stat[info.s] == GLP_BS)
                npp.r_stat[info.p] = GLP_BS;
            else if (npp.c_stat[info.s] == GLP_NL)
                npp.r_stat[info.p] = GLP_NU;
            else if (npp.c_stat[info.s] == GLP_NU)
                npp.r_stat[info.p] = GLP_NL;
            else
            {  npp_error();
                return 1;
            }
            }
            else
            {  npp_error();
                return 1;
            }
            }
            return 0;
        }
    );
    info.p = p.i;
    info.s = s.j;
    /* replace the row by equality constraint */
    p.lb = p.ub;
}

function npp_free_col(npp, q){
    /* process free (unbounded) column */
    var info;
    var s;
    var aij;
    /* the column must be free */
    xassert(q.lb == -DBL_MAX && q.ub == +DBL_MAX);
    /* variable x[q] becomes s' */
    q.lb = 0.0; q.ub = +DBL_MAX;
    /* create variable s'' */
    s = npp_add_col(npp);
    s.is_int = q.is_int;
    s.lb = 0.0; s.ub = +DBL_MAX;
    /* duplicate objective coefficient */
    s.coef = -q.coef;
    /* duplicate column of the constraint matrix */
    for (aij = q.ptr; aij != null; aij = aij.c_next)
        npp_add_aij(aij.row, s, -aij.val);
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover free (unbounded) column */
            if (npp.sol == GLP_SOL)
            {  if (npp.c_stat[info.q] == GLP_BS)
            {  if (npp.c_stat[info.s] == GLP_BS)
            {  npp_error();
                return 1;
            }
            else if (npp.c_stat[info.s] == GLP_NL)
                npp.c_stat[info.q] = GLP_BS;
            else
            {  npp_error();
                return -1;
            }
            }
            else if (npp.c_stat[info.q] == GLP_NL)
            {  if (npp.c_stat[info.s] == GLP_BS)
                npp.c_stat[info.q] = GLP_BS;
            else if (npp.c_stat[info.s] == GLP_NL)
                npp.c_stat[info.q] = GLP_NF;
            else
            {  npp_error();
                return -1;
            }
            }
            else
            {  npp_error();
                return -1;
            }
            }
            /* compute value of x[q] with formula (2) */
            npp.c_value[info.q] -= npp.c_value[info.s];
            return 0;
        }
    );
    info.q = q.j;
    info.s = s.j;
}

function npp_lbnd_col(npp, q){
    /* process column with (non-zero) lower bound */
    var info;
    var i;
    var aij;
    /* the column must have non-zero lower bound */
    xassert(q.lb != 0.0);
    xassert(q.lb != -DBL_MAX);
    xassert(q.lb < q.ub);
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover column with (non-zero) lower bound */
            if (npp.sol == GLP_SOL)
            {  if (npp.c_stat[info.q] == GLP_BS ||
                npp.c_stat[info.q] == GLP_NL ||
                npp.c_stat[info.q] == GLP_NU)
                npp.c_stat[info.q] = npp.c_stat[info.q];
            else
            {  npp_error();
                return 1;
            }
            }
            /* compute value of x[q] with formula (2) */
            npp.c_value[info.q] = info.bnd + npp.c_value[info.q];
            return 0;
        }
    );
    info.q = q.j;
    info.bnd = q.lb;
    /* substitute x[q] into objective row */
    npp.c0 += q.coef * q.lb;
    /* substitute x[q] into constraint rows */
    for (aij = q.ptr; aij != null; aij = aij.c_next)
    {  i = aij.row;
        if (i.lb == i.ub)
            i.ub = (i.lb -= aij.val * q.lb);
        else
        {  if (i.lb != -DBL_MAX)
            i.lb -= aij.val * q.lb;
            if (i.ub != +DBL_MAX)
                i.ub -= aij.val * q.lb;
        }
    }
    /* column x[q] becomes column s */
    if (q.ub != +DBL_MAX)
        q.ub -= q.lb;
    q.lb = 0.0;
}

function npp_ubnd_col(npp, q){
    /* process column with upper bound */
    var info;
    var i;
    var aij;
    /* the column must have upper bound */
    xassert(q.ub != +DBL_MAX);
    xassert(q.lb < q.ub);
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover column with upper bound */
            if (npp.sol == GLP_BS)
            {  if (npp.c_stat[info.q] == GLP_BS)
                npp.c_stat[info.q] = GLP_BS;
            else if (npp.c_stat[info.q] == GLP_NL)
                npp.c_stat[info.q] = GLP_NU;
            else if (npp.c_stat[info.q] == GLP_NU)
                npp.c_stat[info.q] = GLP_NL;
            else
            {  npp_error();
                return 1;
            }
            }
            /* compute value of x[q] with formula (2) */
            npp.c_value[info.q] = info.bnd - npp.c_value[info.q];
            return 0;
        }
    );
    info.q = q.j;
    info.bnd = q.ub;
    /* substitute x[q] into objective row */
    npp.c0 += q.coef * q.ub;
    q.coef = -q.coef;
    /* substitute x[q] into constraint rows */
    for (aij = q.ptr; aij != null; aij = aij.c_next)
    {  i = aij.row;
        if (i.lb == i.ub)
            i.ub = (i.lb -= aij.val * q.ub);
        else
        {  if (i.lb != -DBL_MAX)
            i.lb -= aij.val * q.ub;
            if (i.ub != +DBL_MAX)
                i.ub -= aij.val * q.ub;
        }
        aij.val = -aij.val;
    }
    /* column x[q] becomes column s */
    if (q.lb != -DBL_MAX)
        q.ub -= q.lb;
    else
        q.ub = +DBL_MAX;
    q.lb = 0.0;
}

function npp_dbnd_col(npp, q){
    /* process non-negative column with upper bound */
    var info;
    var p;
    var s;
    /* the column must be non-negative with upper bound */
    xassert(q.lb == 0.0);
    xassert(q.ub > 0.0);
    xassert(q.ub != +DBL_MAX);
    /* create variable s */
    s = npp_add_col(npp);
    s.is_int = q.is_int;
    s.lb = 0.0; s.ub = +DBL_MAX;
    /* create equality constraint (2) */
    p = npp_add_row(npp);
    p.lb = p.ub = q.ub;
    npp_add_aij(p, q, +1.0);
    npp_add_aij(p, s, +1.0);
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover non-negative column with upper bound */
            if (npp.sol == GLP_BS)
            {  if (npp.c_stat[info.q] == GLP_BS)
            {  if (npp.c_stat[info.s] == GLP_BS)
                npp.c_stat[info.q] = GLP_BS;
            else if (npp.c_stat[info.s] == GLP_NL)
                npp.c_stat[info.q] = GLP_NU;
            else
            {  npp_error();
                return 1;
            }
            }
            else if (npp.c_stat[info.q] == GLP_NL)
            {  if (npp.c_stat[info.s] == GLP_BS ||
                npp.c_stat[info.s] == GLP_NL)
                npp.c_stat[info.q] = GLP_NL;
            else
            {  npp_error();
                return 1;
            }
            }
            else
            {  npp_error();
                return 1;
            }
            }
            return 0;
        }
    );
    info.q = q.j;
    info.s = s.j;
    /* remove upper bound of x[q] */
    q.ub = +DBL_MAX;
}

function npp_fixed_col(npp, q){
    /* process fixed column */
    var info;
    var i;
    var aij;
    /* the column must be fixed */
    xassert(q.lb == q.ub);
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover fixed column */
            if (npp.sol == GLP_SOL)
                npp.c_stat[info.q] = GLP_NS;
            npp.c_value[info.q] = info.s;
            return 0;
        }
    );
    info.q = q.j;
    info.s = q.lb;
    /* substitute x[q] = s[q] into objective row */
    npp.c0 += q.coef * q.lb;
    /* substitute x[q] = s[q] into constraint rows */
    for (aij = q.ptr; aij != null; aij = aij.c_next)
    {  i = aij.row;
        if (i.lb == i.ub)
            i.ub = (i.lb -= aij.val * q.lb);
        else
        {  if (i.lb != -DBL_MAX)
            i.lb -= aij.val * q.lb;
            if (i.ub != +DBL_MAX)
                i.ub -= aij.val * q.lb;
        }
    }
    /* remove the column from the problem */
    npp_del_col(npp, q);
}

function npp_make_equality(npp, p){
    /* process row with almost identical bounds */
    var info;
    var b, eps, nint;
    /* the row must be double-sided inequality */
    xassert(p.lb != -DBL_MAX);
    xassert(p.ub != +DBL_MAX);
    xassert(p.lb < p.ub);
    /* check row bounds */
    eps = 1e-9 + 1e-12 * Math.abs(p.lb);
    if (p.ub - p.lb > eps) return 0;
    /* row bounds are very close to each other */
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover row with almost identical bounds */
            if (npp.sol == GLP_SOL)
            {  if (npp.r_stat[info.p] == GLP_BS)
                npp.r_stat[info.p] = GLP_BS;
            else if (npp.r_stat[info.p] == GLP_NS)
            {  if (npp.r_pi[info.p] >= 0.0)
                npp.r_stat[info.p] = GLP_NL;
            else
                npp.r_stat[info.p] = GLP_NU;
            }
            else
            {  npp_error();
                return 1;
            }
            }
            return 0;
        }
    );
    info.p = p.i;
    /* compute right-hand side */
    b = 0.5 * (p.ub + p.lb);
    nint = Math.floor(b + 0.5);
    if (Math.abs(b - nint) <= eps) b = nint;
    /* replace row p by almost equivalent equality constraint */
    p.lb = p.ub = b;
    return 1;
}

function npp_make_fixed(npp, q){
    /* process column with almost identical bounds */
    var info;
    var aij;
    var lfe;
    var s, eps, nint;
    /* the column must be double-bounded */
    xassert(q.lb != -DBL_MAX);
    xassert(q.ub != +DBL_MAX);
    xassert(q.lb < q.ub);
    /* check column bounds */
    eps = 1e-9 + 1e-12 * Math.abs(q.lb);
    if (q.ub - q.lb > eps) return 0;
    /* column bounds are very close to each other */
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover column with almost identical bounds */
            var lfe;
            var lambda;
            if (npp.sol == GLP_SOL)
            {  if (npp.c_stat[info.q] == GLP_BS)
                npp.c_stat[info.q] = GLP_BS;
            else if (npp.c_stat[info.q] == GLP_NS)
            {  /* compute multiplier for column q with formula (6) */
                lambda = info.c;
                for (lfe = info.ptr; lfe != null; lfe = lfe.next)
                    lambda -= lfe.val * npp.r_pi[lfe.ref];
                /* assign status to non-basic column */
                if (lambda >= 0.0)
                    npp.c_stat[info.q] = GLP_NL;
                else
                    npp.c_stat[info.q] = GLP_NU;
            }
            else
            {  npp_error();
                return 1;
            }
            }
            return 0;
        }
    );
    info.q = q.j;
    info.c = q.coef;
    info.ptr = null;
    /* save column coefficients a[i,q] (needed for basic solution
     only) */
    if (npp.sol == GLP_SOL)
    {  for (aij = q.ptr; aij != null; aij = aij.c_next)
    {   lfe = {};
        lfe.ref = aij.row.i;
        lfe.val = aij.val;
        lfe.next = info.ptr;
        info.ptr = lfe;
    }
    }
    /* compute column fixed value */
    s = 0.5 * (q.ub + q.lb);
    nint = Math.floor(s + 0.5);
    if (Math.abs(s - nint) <= eps) s = nint;
    /* make column q fixed */
    q.lb = q.ub = s;
    return 1;
}

function npp_empty_row(npp, p){
    /* process empty row */
    var eps = 1e-3;
    /* the row must be empty */
    xassert(p.ptr == null);
    /* check primal feasibility */
    if (p.lb > +eps || p.ub < -eps)
        return 1;
    /* replace the row by equivalent free (unbounded) row */
    p.lb = -DBL_MAX; p.ub = +DBL_MAX;
    /* and process it */
    npp_free_row(npp, p);
    return 0;
}

function npp_empty_col(npp, q){
    /* process empty column */
    var info;
    var eps = 1e-3;
    /* the column must be empty */
    xassert(q.ptr == null);
    /* check dual feasibility */
    if (q.coef > +eps && q.lb == -DBL_MAX)
        return 1;
    if (q.coef < -eps && q.ub == +DBL_MAX)
        return 1;
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover empty column */
            if (npp.sol == GLP_SOL)
                npp.c_stat[info.q] = info.stat;
            return 0;
        }
    );
    info.q = q.j;
    /* fix the column */

    function lo(){  
        /* column with lower bound */
        info.stat = GLP_NL;
        q.ub = q.lb;
    }

    function up(){
        /* column with upper bound */
        info.stat = GLP_NU;
        q.lb = q.ub;
    }
    
    if (q.lb == -DBL_MAX && q.ub == +DBL_MAX)
    {  /* free column */
        info.stat = GLP_NF;
        q.lb = q.ub = 0.0;
    }
    else if (q.ub == +DBL_MAX)
        lo();   
    else if (q.lb == -DBL_MAX)
        up();
    else if (q.lb != q.ub)
    {  /* double-bounded column */
        if (q.coef >= +DBL_EPSILON) 
            lo();
        else if (q.coef <= -DBL_EPSILON) 
            up();
        else if (Math.abs(q.lb) <= Math.abs(q.ub)) 
            lo();
        else 
            up();
    }
    else
    {  /* fixed column */
        info.stat = GLP_NS;
    }
    /* process fixed column */
    npp_fixed_col(npp, q);
    return 0;
}

function npp_implied_value(npp, q, s){
    /* process implied column value */
    var eps, nint;
    xassert(npp == npp);
    /* column must not be fixed */
    xassert(q.lb < q.ub);
    /* check integrality */
    if (q.is_int)
    {  nint = Math.floor(s + 0.5);
        if (Math.abs(s - nint) <= 1e-5)
            s = nint;
        else
            return 2;
    }
    /* check current column lower bound */
    if (q.lb != -DBL_MAX)
    {  eps = (q.is_int ? 1e-5 : 1e-5 + 1e-8 * Math.abs(q.lb));
        if (s < q.lb - eps) return 1;
        /* if s[q] is close to l[q], fix column at its lower bound
         rather than at the implied value */
        if (s < q.lb + 1e-3 * eps)
        {  q.ub = q.lb;
            return 0;
        }
    }
    /* check current column upper bound */
    if (q.ub != +DBL_MAX)
    {  eps = (q.is_int ? 1e-5 : 1e-5 + 1e-8 * Math.abs(q.ub));
        if (s > q.ub + eps) return 1;
        /* if s[q] is close to u[q], fix column at its upper bound
         rather than at the implied value */
        if (s > q.ub - 1e-3 * eps)
        {  q.lb = q.ub;
            return 0;
        }
    }
    /* fix column at the implied value */
    q.lb = q.ub = s;
    return 0;
}

function npp_eq_singlet(npp, p){
    /* process row singleton (equality constraint) */
    var info;
    var q;
    var aij;
    var lfe;
    var ret;
    var s;
    /* the row must be singleton equality constraint */
    xassert(p.lb == p.ub);
    xassert(p.ptr != null && p.ptr.r_next == null);
    /* compute and process implied column value */
    aij = p.ptr;
    q = aij.col;
    s = p.lb / aij.val;
    ret = npp_implied_value(npp, q, s);
    xassert(0 <= ret && ret <= 2);
    if (ret != 0) return ret;
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover row singleton (equality constraint) */
            var lfe;
            var temp;
            if (npp.sol == GLP_SOL)
            {  /* column q must be already recovered as GLP_NS */
                if (npp.c_stat[info.q] != GLP_NS)
                {  npp_error();
                    return 1;
                }
                npp.r_stat[info.p] = GLP_NS;
                npp.c_stat[info.q] = GLP_BS;
            }
            if (npp.sol != GLP_MIP)
            {  /* compute multiplier for row p with formula (3) */
                temp = info.c;
                for (lfe = info.ptr; lfe != null; lfe = lfe.next)
                    temp -= lfe.val * npp.r_pi[lfe.ref];
                npp.r_pi[info.p] = temp / info.apq;
            }
            return 0;
        }
    );
    info.p = p.i;
    info.q = q.j;
    info.apq = aij.val;
    info.c = q.coef;
    info.ptr = null;
    /* save column coefficients a[i,q], i != p (not needed for MIP
     solution) */
    if (npp.sol != GLP_MIP)
    {  for (aij = q.ptr; aij != null; aij = aij.c_next)
    {  if (aij.row == p) continue; /* skip a[p,q] */
        lfe = {};
        lfe.ref = aij.row.i;
        lfe.val = aij.val;
        lfe.next = info.ptr;
        info.ptr = lfe;
    }
    }
    /* remove the row from the problem */
    npp_del_row(npp, p);
    return 0;
}

function npp_implied_lower(npp, q, l){
    /* process implied column lower bound */
    var ret;
    var eps, nint;
    xassert(npp == npp);
    /* column must not be fixed */
    xassert(q.lb < q.ub);
    /* implied lower bound must be finite */
    xassert(l != -DBL_MAX);
    /* if column is integral, round up l'[q] */
    if (q.is_int)
    {  nint = Math.floor(l + 0.5);
        if (Math.abs(l - nint) <= 1e-5)
            l = nint;
        else
            l = Math.ceil(l);
    }
    /* check current column lower bound */
    if (q.lb != -DBL_MAX)
    {  eps = (q.is_int ? 1e-3 : 1e-3 + 1e-6 * Math.abs(q.lb));
        if (l < q.lb + eps)
        {  ret = 0; /* redundant */
            return ret;
        }
    }
    /* check current column upper bound */
    if (q.ub != +DBL_MAX)
    {  eps = (q.is_int ? 1e-5 : 1e-5 + 1e-8 * Math.abs(q.ub));
        if (l > q.ub + eps)
        {  ret = 4; /* infeasible */
            return ret;
        }
        /* if l'[q] is close to u[q], fix column at its upper bound */
        if (l > q.ub - 1e-3 * eps)
        {  q.lb = q.ub;
            ret = 3; /* fixed */
            return ret;
        }
    }
    /* check if column lower bound changes significantly */
    if (q.lb == -DBL_MAX)
        ret = 2; /* significantly */
    else if (q.is_int && l > q.lb + 0.5)
        ret = 2; /* significantly */
    else if (l > q.lb + 0.30 * (1.0 + Math.abs(q.lb)))
        ret = 2; /* significantly */
    else
        ret = 1; /* not significantly */
    /* set new column lower bound */
    q.lb = l;
    return ret;
}

function npp_implied_upper(npp, q, u){
    var ret;
    var eps, nint;
    xassert(npp == npp);
    /* column must not be fixed */
    xassert(q.lb < q.ub);
    /* implied upper bound must be finite */
    xassert(u != +DBL_MAX);
    /* if column is integral, round down u'[q] */
    if (q.is_int)
    {  nint = Math.floor(u + 0.5);
        if (Math.abs(u - nint) <= 1e-5)
            u = nint;
        else
            u = Math.floor(u);
    }
    /* check current column upper bound */
    if (q.ub != +DBL_MAX)
    {  eps = (q.is_int ? 1e-3 : 1e-3 + 1e-6 * Math.abs(q.ub));
        if (u > q.ub - eps)
        {  ret = 0; /* redundant */
            return ret;
        }
    }
    /* check current column lower bound */
    if (q.lb != -DBL_MAX)
    {  eps = (q.is_int ? 1e-5 : 1e-5 + 1e-8 * Math.abs(q.lb));
        if (u < q.lb - eps)
        {  ret = 4; /* infeasible */
            return ret;
        }
        /* if u'[q] is close to l[q], fix column at its lower bound */
        if (u < q.lb + 1e-3 * eps)
        {  q.ub = q.lb;
            ret = 3; /* fixed */
            return ret;
        }
    }
    /* check if column upper bound changes significantly */
    if (q.ub == +DBL_MAX)
        ret = 2; /* significantly */
    else if (q.is_int && u < q.ub - 0.5)
        ret = 2; /* significantly */
    else if (u < q.ub - 0.30 * (1.0 + Math.abs(q.ub)))
        ret = 2; /* significantly */
    else
        ret = 1; /* not significantly */
    /* set new column upper bound */
    q.ub = u;
    return ret;
}

function npp_ineq_singlet(npp, p){
    /* process row singleton (inequality constraint) */
    var info;
    var q;
    var apq, aij;
    var lfe;
    var lb_changed, ub_changed;
    var ll, uu;
    /* the row must be singleton inequality constraint */
    xassert(p.lb != -DBL_MAX || p.ub != +DBL_MAX);
    xassert(p.lb < p.ub);
    xassert(p.ptr != null && p.ptr.r_next == null);
    /* compute implied column bounds */
    apq = p.ptr;
    q = apq.col;
    xassert(q.lb < q.ub);
    if (apq.val > 0.0)
    {  ll = (p.lb == -DBL_MAX ? -DBL_MAX : p.lb / apq.val);
        uu = (p.ub == +DBL_MAX ? +DBL_MAX : p.ub / apq.val);
    }
    else
    {  ll = (p.ub == +DBL_MAX ? -DBL_MAX : p.ub / apq.val);
        uu = (p.lb == -DBL_MAX ? +DBL_MAX : p.lb / apq.val);
    }
    /* process implied column lower bound */
    if (ll == -DBL_MAX)
        lb_changed = 0;
    else
    {  lb_changed = npp_implied_lower(npp, q, ll);
        xassert(0 <= lb_changed && lb_changed <= 4);
        if (lb_changed == 4) return 4; /* infeasible */
    }
    /* process implied column upper bound */
    if (uu == +DBL_MAX)
        ub_changed = 0;
    else if (lb_changed == 3)
    {  /* column was fixed on its upper bound due to l'[q] = u[q] */
        /* note that L[p] < U[p], so l'[q] = u[q] < u'[q] */
        ub_changed = 0;
    }
    else
    {  ub_changed = npp_implied_upper(npp, q, uu);
        xassert(0 <= ub_changed && ub_changed <= 4);
        if (ub_changed == 4) return 4; /* infeasible */
    }
    /* if neither lower nor upper column bound was changed, the row
     is originally redundant and can be replaced by free row */
    if (!lb_changed && !ub_changed)
    {  p.lb = -DBL_MAX; p.ub = +DBL_MAX;
        npp_free_row(npp, p);
        return 0;
    }
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover row singleton (inequality constraint) */
            var lfe;
            var lambda;
            if (npp.sol == GLP_MIP) return 0;
            /* compute lambda~[q] in solution to the transformed problem
             with formula (8) */
            lambda = info.c;
            for (lfe = info.ptr; lfe != null; lfe = lfe.next)
                lambda -= lfe.val * npp.r_pi[lfe.ref];
            if (npp.sol == GLP_SOL)
            {  /* recover basic solution */

                function nl(){  /* column q is non-basic with lower bound active */
                    if (info.lb_changed)
                    {  /* it is implied bound, so actually row p is active
                     while column q is basic */
                        npp.r_stat[info.p] =
                            (info.apq > 0.0 ? GLP_NL : GLP_NU);
                        npp.c_stat[info.q] = GLP_BS;
                        npp.r_pi[info.p] = lambda / info.apq;
                    }
                    else
                    {  /* it is original bound, so row p is inactive */
                        npp.r_stat[info.p] = GLP_BS;
                        npp.r_pi[info.p] = 0.0;
                    }
                    return 0;
                }

                function nu(){
                    /* column q is non-basic with upper bound active */
                    if (info.ub_changed)
                    {  /* it is implied bound, so actually row p is active
                     while column q is basic */
                        npp.r_stat[info.p] =
                            (info.apq > 0.0 ? GLP_NU : GLP_NL);
                        npp.c_stat[info.q] = GLP_BS;
                        npp.r_pi[info.p] = lambda / info.apq;
                    }
                    else
                    {  /* it is original bound, so row p is inactive */
                        npp.r_stat[info.p] = GLP_BS;
                        npp.r_pi[info.p] = 0.0;
                    }
                    return 0;
                }


                if (npp.c_stat[info.q] == GLP_BS)
                {  /* column q is basic, so row p is inactive */
                    npp.r_stat[info.p] = GLP_BS;
                    npp.r_pi[info.p] = 0.0;
                }
                else if (npp.c_stat[info.q] == GLP_NL)
                    nl();
                else if (npp.c_stat[info.q] == GLP_NU)
                    nu();
                else if (npp.c_stat[info.q] == GLP_NS)
                {  /* column q is non-basic and fixed; note, however, that in
                 in the original problem it is non-fixed */
                    if (lambda > +1e-7)
                    {  if (info.apq > 0.0 && info.lb != -DBL_MAX ||
                        info.apq < 0.0 && info.ub != +DBL_MAX ||
                        !info.lb_changed)
                    {  /* either corresponding bound of row p exists or
                     column q remains non-basic with its original lower
                     bound active */
                        npp.c_stat[info.q] = GLP_NL;
                        return nl();
                    }
                    }
                    if (lambda < -1e-7)
                    {  if (info.apq > 0.0 && info.ub != +DBL_MAX ||
                        info.apq < 0.0 && info.lb != -DBL_MAX ||
                        !info.ub_changed)
                    {  /* either corresponding bound of row p exists or
                     column q remains non-basic with its original upper
                     bound active */
                        npp.c_stat[info.q] = GLP_NU;
                        return nu();
                    }
                    }
                    /* either lambda~[q] is close to zero, or corresponding
                     bound of row p does not exist, because lambda~[q] has
                     wrong sign due to round-off errors; in the latter case
                     lambda~[q] is also assumed to be close to zero; so, we
                     can make row p active on its existing bound and column q
                     basic; pi[p] will have wrong sign, but it also will be
                     close to zero (rarus casus of dual degeneracy) */
                    if (info.lb != -DBL_MAX && info.ub == +DBL_MAX)
                    {  /* row lower bound exists, but upper bound doesn't */
                        npp.r_stat[info.p] = GLP_NL;
                    }
                    else if (info.lb == -DBL_MAX && info.ub != +DBL_MAX)
                    {  /* row upper bound exists, but lower bound doesn't */
                        npp.r_stat[info.p] = GLP_NU;
                    }
                    else if (info.lb != -DBL_MAX && info.ub != +DBL_MAX)
                    {  /* both row lower and upper bounds exist */
                        /* to choose proper active row bound we should not use
                         lambda~[q], because its value being close to zero is
                         unreliable; so we choose that bound which provides
                         primal feasibility for original constraint (1) */
                        if (info.apq * npp.c_value[info.q] <=
                            0.5 * (info.lb + info.ub))
                            npp.r_stat[info.p] = GLP_NL;
                        else
                            npp.r_stat[info.p] = GLP_NU;
                    }
                    else
                    {  npp_error();
                        return 1;
                    }
                    npp.c_stat[info.q] = GLP_BS;
                    npp.r_pi[info.p] = lambda / info.apq;
                }
                else
                {  npp_error();
                    return 1;
                }
            }

            if (npp.sol == GLP_IPT)
            {  /* recover interior-point solution */
                if (lambda > +DBL_EPSILON && info.lb_changed ||
                    lambda < -DBL_EPSILON && info.ub_changed)
                {  /* actually row p has corresponding active bound */
                    npp.r_pi[info.p] = lambda / info.apq;
                }
                else
                {  /* either bounds of column q are both inactive or its
                 original bound is active */
                    npp.r_pi[info.p] = 0.0;
                }
            }
            return 0;
        }
    );
    info.p = p.i;
    info.q = q.j;
    info.apq = apq.val;
    info.c = q.coef;
    info.lb = p.lb;
    info.ub = p.ub;
    info.lb_changed = lb_changed;
    info.ub_changed = ub_changed;
    info.ptr = null;
    /* save column coefficients a[i,q], i != p (not needed for MIP
     solution) */
    if (npp.sol != GLP_MIP)
    {  for (aij = q.ptr; aij != null; aij = aij.c_next)
    {  if (aij == apq) continue; /* skip a[p,q] */
        lfe = {};
        lfe.ref = aij.row.i;
        lfe.val = aij.val;
        lfe.next = info.ptr;
        info.ptr = lfe;
    }
    }
    /* remove the row from the problem */
    npp_del_row(npp, p);
    return lb_changed >= ub_changed ? lb_changed : ub_changed;
}

function npp_implied_slack(npp, q){
    /* process column singleton (implied slack variable) */
    var info;
    var p;
    var aij;
    var lfe;
    /* the column must be non-integral non-fixed singleton */
    xassert(!q.is_int);
    xassert(q.lb < q.ub);
    xassert(q.ptr != null && q.ptr.c_next == null);
    /* corresponding row must be equality constraint */
    aij = q.ptr;
    p = aij.row;
    xassert(p.lb == p.ub);
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover column singleton (implied slack variable) */
            var temp;
            var lfe;
            if (npp.sol == GLP_SOL)
            {  /* assign statuses to row p and column q */
                if (npp.r_stat[info.p] == GLP_BS ||
                    npp.r_stat[info.p] == GLP_NF)
                    npp.c_stat[info.q] = npp.r_stat[info.p];
                else if (npp.r_stat[info.p] == GLP_NL)
                    npp.c_stat[info.q] =
                        (info.apq > 0.0 ? GLP_NU : GLP_NL);
                else if (npp.r_stat[info.p] == GLP_NU)
                    npp.c_stat[info.q] =
                        (info.apq > 0.0 ? GLP_NL : GLP_NU);
                else
                {  npp_error();
                    return 1;
                }
                npp.r_stat[info.p] = GLP_NS;
            }
            if (npp.sol != GLP_MIP)
            {  /* compute multiplier for row p */
                npp.r_pi[info.p] += info.c / info.apq;
            }
            /* compute value of column q */
            temp = info.b;
            for (lfe = info.ptr; lfe != null; lfe = lfe.next)
                temp -= lfe.val * npp.c_value[lfe.ref];
            npp.c_value[info.q] = temp / info.apq;
            return 0;
        }
    );
    info.p = p.i;
    info.q = q.j;
    info.apq = aij.val;
    info.b = p.lb;
    info.c = q.coef;
    info.ptr = null;
    /* save row coefficients a[p,j], j != q, and substitute x[q]
     into the objective row */
    for (aij = p.ptr; aij != null; aij = aij.r_next)
    {  if (aij.col == q) continue; /* skip a[p,q] */
        lfe = {};
        lfe.ref = aij.col.j;
        lfe.val = aij.val;
        lfe.next = info.ptr;
        info.ptr = lfe;
        aij.col.coef -= info.c * (aij.val / info.apq);
    }
    npp.c0 += info.c * (info.b / info.apq);
    /* compute new row bounds */
    if (info.apq > 0.0)
    {  p.lb = (q.ub == +DBL_MAX ?
        -DBL_MAX : info.b - info.apq * q.ub);
        p.ub = (q.lb == -DBL_MAX ?
            +DBL_MAX : info.b - info.apq * q.lb);
    }
    else
    {  p.lb = (q.lb == -DBL_MAX ?
        -DBL_MAX : info.b - info.apq * q.lb);
        p.ub = (q.ub == +DBL_MAX ?
            +DBL_MAX : info.b - info.apq * q.ub);
    }
    /* remove the column from the problem */
    npp_del_col(npp, q);
}

function npp_implied_free(npp, q){
    /* process column singleton (implied free variable) */
    var info;
    var p;
    var apq, aij;
    var alfa, beta, l, u, pi, eps;
    /* the column must be non-fixed singleton */
    xassert(q.lb < q.ub);
    xassert(q.ptr != null && q.ptr.c_next == null);
    /* corresponding row must be inequality constraint */
    apq = q.ptr;
    p = apq.row;
    xassert(p.lb != -DBL_MAX || p.ub != +DBL_MAX);
    xassert(p.lb < p.ub);
    /* compute alfa */
    alfa = p.lb;
    if (alfa != -DBL_MAX)
    {  for (aij = p.ptr; aij != null; aij = aij.r_next)
    {  if (aij == apq) continue; /* skip a[p,q] */
        if (aij.val > 0.0)
        {  if (aij.col.ub == +DBL_MAX)
        {  alfa = -DBL_MAX;
            break;
        }
            alfa -= aij.val * aij.col.ub;
        }
        else /* < 0.0 */
        {  if (aij.col.lb == -DBL_MAX)
        {  alfa = -DBL_MAX;
            break;
        }
            alfa -= aij.val * aij.col.lb;
        }
    }
    }
    /* compute beta */
    beta = p.ub;
    if (beta != +DBL_MAX)
    {  for (aij = p.ptr; aij != null; aij = aij.r_next)
    {  if (aij == apq) continue; /* skip a[p,q] */
        if (aij.val > 0.0)
        {  if (aij.col.lb == -DBL_MAX)
        {  beta = +DBL_MAX;
            break;
        }
            beta -= aij.val * aij.col.lb;
        }
        else /* < 0.0 */
        {  if (aij.col.ub == +DBL_MAX)
        {  beta = +DBL_MAX;
            break;
        }
            beta -= aij.val * aij.col.ub;
        }
    }
    }
    /* compute implied column lower bound l'[q] */
    if (apq.val > 0.0)
        l = (alfa == -DBL_MAX ? -DBL_MAX : alfa / apq.val);
    else /* < 0.0 */
        l = (beta == +DBL_MAX ? -DBL_MAX : beta / apq.val);
    /* compute implied column upper bound u'[q] */
    if (apq.val > 0.0)
        u = (beta == +DBL_MAX ? +DBL_MAX : beta / apq.val);
    else
        u = (alfa == -DBL_MAX ? +DBL_MAX : alfa / apq.val);
    /* check if column lower bound l[q] can be active */
    if (q.lb != -DBL_MAX)
    {  eps = 1e-9 + 1e-12 * Math.abs(q.lb);
        if (l < q.lb - eps) return 1; /* yes, it can */
    }
    /* check if column upper bound u[q] can be active */
    if (q.ub != +DBL_MAX)
    {  eps = 1e-9 + 1e-12 * Math.abs(q.ub);
        if (u > q.ub + eps) return 1; /* yes, it can */
    }
    /* okay; make column q free (unbounded) */
    q.lb = -DBL_MAX; q.ub = +DBL_MAX;
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover column singleton (implied free variable) */
            if (npp.sol == GLP_SOL)
            {  if (npp.r_stat[info.p] == GLP_BS)
                npp.r_stat[info.p] = GLP_BS;
            else if (npp.r_stat[info.p] == GLP_NS)
            {  xassert(info.stat == GLP_NL || info.stat == GLP_NU);
                npp.r_stat[info.p] = info.stat;
            }
            else
            {  npp_error();
                return 1;
            }
            }
            return 0;
        }
    );
    info.p = p.i;
    info.stat = -1;
    /* compute row multiplier pi[p] */
    pi = q.coef / apq.val;
    /* check dual feasibility for row p */

    function nl(){
        info.stat = GLP_NL;
        p.ub = p.lb;
    }

    function nu(){
        info.stat = GLP_NU;
        p.lb = p.ub;
    }

    if (pi > +DBL_EPSILON)
    {  /* lower bound L[p] must be active */
        if (p.lb != -DBL_MAX)
            nl();
        else
        {  if (pi > +1e-5) return 2; /* dual infeasibility */
            /* take a chance on U[p] */
            xassert(p.ub != +DBL_MAX);
            nu();
        }
    }
    else if (pi < -DBL_EPSILON)
    {  /* upper bound U[p] must be active */
        if (p.ub != +DBL_MAX)
            nu();
        else
        {  if (pi < -1e-5) return 2; /* dual infeasibility */
            /* take a chance on L[p] */
            xassert(p.lb != -DBL_MAX);
            nl();
        }
    }
    else
    {  /* any bound (either L[p] or U[p]) can be made active  */
        if (p.ub == +DBL_MAX)
        {  xassert(p.lb != -DBL_MAX);
           nl();
        }
        else if (p.lb == -DBL_MAX)
        {  xassert(p.ub != +DBL_MAX);
            nu();
        } else {
            if (Math.abs(p.lb) <= Math.abs(p.ub)) nl(); else nu();
        }

    }
    return 0;
}

function npp_eq_doublet(npp, p){
    /* process row doubleton (equality constraint) */
    var info;
    var i;
    var q, r;
    var apq, apr, aiq, air, next;
    var lfe;
    var gamma;
    /* the row must be doubleton equality constraint */
    xassert(p.lb == p.ub);
    xassert(p.ptr != null && p.ptr.r_next != null &&
        p.ptr.r_next.r_next == null);
    /* choose column to be eliminated */
    {  var a1, a2;
        a1 = p.ptr; a2 = a1.r_next;
        if (Math.abs(a2.val) < 0.001 * Math.abs(a1.val))
        {  /* only first column can be eliminated, because second one
         has too small constraint coefficient */
            apq = a1; apr = a2;
        }
        else if (Math.abs(a1.val) < 0.001 * Math.abs(a2.val))
        {  /* only second column can be eliminated, because first one
         has too small constraint coefficient */
            apq = a2; apr = a1;
        }
        else
        {  /* both columns are appropriate; choose that one which is
         shorter to minimize fill-in */
            if (npp_col_nnz(a1.col) <= npp_col_nnz(a2.col))
            {  /* first column is shorter */
                apq = a1; apr = a2;
            }
            else
            {  /* second column is shorter */
                apq = a2; apr = a1;
            }
        }
    }
    /* now columns q and r have been chosen */
    q = apq.col; r = apr.col;
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover row doubleton (equality constraint) */
            var lfe;
            var gamma, temp;
            /* we assume that processing row p is followed by processing
             column q as singleton of type "implied slack variable", in
             which case row p must always be active equality constraint */
            if (npp.sol == GLP_SOL)
            {  if (npp.r_stat[info.p] != GLP_NS)
            {  npp_error();
                return 1;
            }
            }
            if (npp.sol != GLP_MIP)
            {  /* compute value of multiplier for row p; see (14) */
                temp = npp.r_pi[info.p];
                for (lfe = info.ptr; lfe != null; lfe = lfe.next)
                {  gamma = lfe.val / info.apq; /* a[i,q] / a[p,q] */
                    temp -= gamma * npp.r_pi[lfe.ref];
                }
                npp.r_pi[info.p] = temp;
            }
            return 0;
        }
    );
    info.p = p.i;
    info.apq = apq.val;
    info.ptr = null;
    /* transform each row i (i != p), where a[i,q] != 0, to eliminate
     column q */
    for (aiq = q.ptr; aiq != null; aiq = next)
    {  next = aiq.c_next;
        if (aiq == apq) continue; /* skip row p */
        i = aiq.row; /* row i to be transformed */
        /* save constraint coefficient a[i,q] */
        if (npp.sol != GLP_MIP)
        {  lfe = {};
            lfe.ref = i.i;
            lfe.val = aiq.val;
            lfe.next = info.ptr;
            info.ptr = lfe;
        }
        /* find coefficient a[i,r] in row i */
        for (air = i.ptr; air != null; air = air.r_next)
            if (air.col == r) break;
        /* if a[i,r] does not exist, create a[i,r] = 0 */
        if (air == null)
            air = npp_add_aij(i, r, 0.0);
        /* compute gamma[i] = a[i,q] / a[p,q] */
        gamma = aiq.val / apq.val;
        /* (row i) := (row i) - gamma[i] * (row p); see (3)-(6) */
        /* new a[i,q] is exact zero due to elimnation; remove it from
         row i */
        npp_del_aij(aiq);
        /* compute new a[i,r] */
        air.val -= gamma * apr.val;
        /* if new a[i,r] is close to zero due to numeric cancelation,
         remove it from row i */
        if (Math.abs(air.val) <= 1e-10)
            npp_del_aij(air);
        /* compute new lower and upper bounds of row i */
        if (i.lb == i.ub)
            i.lb = i.ub = (i.lb - gamma * p.lb);
        else
        {  if (i.lb != -DBL_MAX)
            i.lb -= gamma * p.lb;
            if (i.ub != +DBL_MAX)
                i.ub -= gamma * p.lb;
        }
    }
    return q;
}

function npp_forcing_row(npp, p, at){
    /* process forcing row */
    var info;
    var col = null;
    var j;
    var apj, aij;
    var lfe;
    var big;
    xassert(at == 0 || at == 1);
    /* determine maximal magnitude of the row coefficients */
    big = 1.0;
    for (apj = p.ptr; apj != null; apj = apj.r_next)
        if (big < Math.abs(apj.val)) big = Math.abs(apj.val);
    /* if there are too small coefficients in the row, transformation
     should not be applied */
    for (apj = p.ptr; apj != null; apj = apj.r_next)
        if (Math.abs(apj.val) < 1e-7 * big) return 1;
    /* create transformation stack entry */
    info = npp_push_tse(npp,
        function (npp, info){
            /* recover forcing row */
            var col, piv;
            var lfe;
            var d, big, temp;
            if (npp.sol == GLP_MIP) return 0;
            /* initially solution to the original problem is the same as
             to the transformed problem, where row p is inactive constraint
             with pi[p] = 0, and all columns are non-basic */
            if (npp.sol == GLP_SOL)
            {  if (npp.r_stat[info.p] != GLP_BS)
            {  npp_error();
                return 1;
            }
                for (col = info.ptr; col != null; col = col.next)
                {  if (npp.c_stat[col.j] != GLP_NS)
                {  npp_error();
                    return 1;
                }
                    npp.c_stat[col.j] = col.stat; /* original status */
                }
            }
            /* compute reduced costs d[j] for all columns with formula (10)
             and store them in col.c instead objective coefficients */
            for (col = info.ptr; col != null; col = col.next)
            {  d = col.c;
                for (lfe = col.ptr; lfe != null; lfe = lfe.next)
                    d -= lfe.val * npp.r_pi[lfe.ref];
                col.c = d;
            }
            /* consider columns j, whose multipliers lambda[j] has wrong
             sign in solution to the transformed problem (where lambda[j] =
             d[j]), and choose column q, whose multipler lambda[q] reaches
             zero last on changing row multiplier pi[p]; see (14) */
            piv = null; big = 0.0;
            for (col = info.ptr; col != null; col = col.next)
            {  d = col.c; /* d[j] */
                temp = Math.abs(d / col.a);
                if (col.stat == GLP_NL)
                {  /* column j has active lower bound */
                    if (d < 0.0 && big < temp){
                        piv = col; big = temp;
                    }
                }
                else if (col.stat == GLP_NU)
                {  /* column j has active upper bound */
                    if (d > 0.0 && big < temp){
                        piv = col; big = temp;
                    }
                }
                else
                {  npp_error();
                    return 1;
                }
            }
            /* if column q does not exist, no correction is needed */
            if (piv != null)
            {  /* correct solution; row p becomes active constraint while
             column q becomes basic */
                if (npp.sol == GLP_SOL)
                {  npp.r_stat[info.p] = info.stat;
                    npp.c_stat[piv.j] = GLP_BS;
                }
                /* assign new value to row multiplier pi[p] = d[p] / a[p,q] */
                npp.r_pi[info.p] = piv.c / piv.a;
            }
            return 0;
        }
    );
    info.p = p.i;
    if (p.lb == p.ub)
    {  /* equality constraint */
        info.stat = GLP_NS;
    }
    else if (at == 0)
    {  /* inequality constraint; case L[p] = U'[p] */
        info.stat = GLP_NL;
        xassert(p.lb != -DBL_MAX);
    }
    else /* at == 1 */
    {  /* inequality constraint; case U[p] = L'[p] */
        info.stat = GLP_NU;
        xassert(p.ub != +DBL_MAX);
    }
    info.ptr = null;
    /* scan the forcing row, fix columns at corresponding bounds, and
     save column information (the latter is not needed for MIP) */
    for (apj = p.ptr; apj != null; apj = apj.r_next)
    {  /* column j has non-zero coefficient in the forcing row */
        j = apj.col;
        /* it must be non-fixed */
        xassert(j.lb < j.ub);
        /* allocate stack entry to save column information */
        if (npp.sol != GLP_MIP)
        {  col = {};
            col.j = j.j;
            col.stat = -1; /* will be set below */
            col.a = apj.val;
            col.c = j.coef;
            col.ptr = null;
            col.next = info.ptr;
            info.ptr = col;
        }
        /* fix column j */
        if (at == 0 && apj.val < 0.0 || at != 0 && apj.val > 0.0)
        {  /* at its lower bound */
            if (npp.sol != GLP_MIP)
                col.stat = GLP_NL;
            xassert(j.lb != -DBL_MAX);
            j.ub = j.lb;
        }
        else
        {  /* at its upper bound */
            if (npp.sol != GLP_MIP)
                col.stat = GLP_NU;
            xassert(j.ub != +DBL_MAX);
            j.lb = j.ub;
        }
        /* save column coefficients a[i,j], i != p */
        if (npp.sol != GLP_MIP)
        {  for (aij = j.ptr; aij != null; aij = aij.c_next)
        {  if (aij == apj) continue; /* skip a[p,j] */
            lfe = {};
            lfe.ref = aij.row.i;
            lfe.val = aij.val;
            lfe.next = col.ptr;
            col.ptr = lfe;
        }
        }
    }
    /* make the row free (unbounded) */
    p.lb = -DBL_MAX; p.ub = +DBL_MAX;
    return 0;
}

function npp_analyze_row(npp, p){
    /* perform general row analysis */
    var aij;
    var ret = 0x00;
    var l, u, eps;
    xassert(npp == npp);
    /* compute implied lower bound L'[p]; see (3) */
    l = 0.0;
    for (aij = p.ptr; aij != null; aij = aij.r_next)
    {  if (aij.val > 0.0)
    {  if (aij.col.lb == -DBL_MAX)
    {  l = -DBL_MAX;
        break;
    }
        l += aij.val * aij.col.lb;
    }
    else /* aij.val < 0.0 */
    {  if (aij.col.ub == +DBL_MAX)
    {  l = -DBL_MAX;
        break;
    }
        l += aij.val * aij.col.ub;
    }
    }
    /* compute implied upper bound U'[p]; see (4) */
    u = 0.0;
    for (aij = p.ptr; aij != null; aij = aij.r_next)
    {  if (aij.val > 0.0)
    {  if (aij.col.ub == +DBL_MAX)
    {  u = +DBL_MAX;
        break;
    }
        u += aij.val * aij.col.ub;
    }
    else /* aij.val < 0.0 */
    {  if (aij.col.lb == -DBL_MAX)
    {  u = +DBL_MAX;
        break;
    }
        u += aij.val * aij.col.lb;
    }
    }
    /* column bounds are assumed correct, so L'[p] <= U'[p] */
    /* check if row lower bound is consistent */
    if (p.lb != -DBL_MAX)
    {  eps = 1e-3 + 1e-6 * Math.abs(p.lb);
        if (p.lb - eps > u)
        {  ret = 0x33;
            return ret;
        }
    }
    /* check if row upper bound is consistent */
    if (p.ub != +DBL_MAX)
    {  eps = 1e-3 + 1e-6 * Math.abs(p.ub);
        if (p.ub + eps < l)
        {  ret = 0x33;
            return ret;
        }
    }
    /* check if row lower bound can be active/forcing */
    if (p.lb != -DBL_MAX)
    {  eps = 1e-9 + 1e-12 * Math.abs(p.lb);
        if (p.lb - eps > l)
        {  if (p.lb + eps <= u)
            ret |= 0x01;
        else
            ret |= 0x02;
        }
    }
    /* check if row upper bound can be active/forcing */
    if (p.ub != +DBL_MAX)
    {  eps = 1e-9 + 1e-12 * Math.abs(p.ub);
        if (p.ub + eps < u)
        {  /* check if the upper bound is forcing */
            if (p.ub - eps >= l)
                ret |= 0x10;
            else
                ret |= 0x20;
        }
    }
    return ret;
}

function npp_inactive_bound(npp, p, which){
    /* remove row lower/upper inactive bound */
    var info;
    if (npp.sol == GLP_SOL)
    {  /* create transformation stack entry */
        info = npp_push_tse(npp,
            function (npp, info){
                /* recover row status */
                if (npp.sol != GLP_SOL)
                {  npp_error();
                    return 1;
                }
                if (npp.r_stat[info.p] == GLP_BS)
                    npp.r_stat[info.p] = GLP_BS;
                else
                    npp.r_stat[info.p] = info.stat;
                return 0;
            }
        );
        info.p = p.i;
        if (p.ub == +DBL_MAX)
            info.stat = GLP_NL;
        else if (p.lb == -DBL_MAX)
            info.stat = GLP_NU;
        else if (p.lb != p.ub)
            info.stat = (which == 0 ? GLP_NU : GLP_NL);
        else
            info.stat = GLP_NS;
    }
    /* remove row inactive bound */
    if (which == 0)
    {  xassert(p.lb != -DBL_MAX);
        p.lb = -DBL_MAX;
    }
    else if (which == 1)
    {  xassert(p.ub != +DBL_MAX);
        p.ub = +DBL_MAX;
    }
    else
        xassert(which != which);
}

function npp_implied_bounds(npp, p){
    var apj, apk;
    var big, eps, temp;
    var skip = false;
    xassert(npp == npp);
    /* initialize implied bounds for all variables and determine
     maximal magnitude of row coefficients a[p,j] */
    big = 1.0;
    for (apj = p.ptr; apj != null; apj = apj.r_next)
    {  apj.col.ll.ll = -DBL_MAX; apj.col.uu.uu = +DBL_MAX;
        if (big < Math.abs(apj.val)) big = Math.abs(apj.val);
    }
    eps = 1e-6 * big;
    /* process row lower bound (assuming that it can be active) */
    if (p.lb != -DBL_MAX){
        apk = null;

        for (apj = p.ptr; apj != null; apj = apj.r_next){
            if (apj.val > 0.0 && apj.col.ub == +DBL_MAX || apj.val < 0.0 && apj.col.lb == -DBL_MAX){
                if (apk == null)
                    apk = apj;
                else {
                    skip = true;
                    break;
                }
            }
        }
        if (!skip){
            /* if a[p,k] = null then |J'| = 0 else J' = { k } */
            temp = p.lb;
            for (apj = p.ptr; apj != null; apj = apj.r_next)
            {  if (apj == apk){
                /* skip a[p,k] */
            }
            else if (apj.val > 0.0)
                temp -= apj.val * apj.col.ub;
            else /* apj.val < 0.0 */
                temp -= apj.val * apj.col.lb;
            }
            /* compute column implied bounds */
            if (apk == null)
            {  /* temp = L[p] - U'[p] */
                for (apj = p.ptr; apj != null; apj = apj.r_next)
                {  if (apj.val >= +eps)
                {  /* l'[j] := u[j] + (L[p] - U'[p]) / a[p,j] */
                    apj.col.ll.ll = apj.col.ub + temp / apj.val;
                }
                else if (apj.val <= -eps)
                {  /* u'[j] := l[j] + (L[p] - U'[p]) / a[p,j] */
                    apj.col.uu.uu = apj.col.lb + temp / apj.val;
                }
                }
            }
            else
            {  /* temp = L[p,k] */
                if (apk.val >= +eps)
                {  /* l'[k] := L[p,k] / a[p,k] */
                    apk.col.ll.ll = temp / apk.val;
                }
                else if (apk.val <= -eps)
                {  /* u'[k] := L[p,k] / a[p,k] */
                    apk.col.uu.uu = temp / apk.val;
                }
            }
        }
    }

    skip = false;
    /* process row upper bound (assuming that it can be active) */
    if (p.ub != +DBL_MAX)
    {  apk = null;
        for (apj = p.ptr; apj != null; apj = apj.r_next){
            if (apj.val > 0.0 && apj.col.lb == -DBL_MAX || apj.val < 0.0 && apj.col.ub == +DBL_MAX){
                if (apk == null)
                    apk = apj;
                else {
                    skip = true;
                    break;
                }
            }
        }
        if (!skip){
            /* if a[p,k] = null then |J''| = 0 else J'' = { k } */
            temp = p.ub;
            for (apj = p.ptr; apj != null; apj = apj.r_next)
            {  if (apj == apk){
                /* skip a[p,k] */
            }
            else if (apj.val > 0.0)
                temp -= apj.val * apj.col.lb;
            else /* apj.val < 0.0 */
                temp -= apj.val * apj.col.ub;
            }
            /* compute column implied bounds */
            if (apk == null)
            {  /* temp = U[p] - L'[p] */
                for (apj = p.ptr; apj != null; apj = apj.r_next)
                {  if (apj.val >= +eps)
                {  /* u'[j] := l[j] + (U[p] - L'[p]) / a[p,j] */
                    apj.col.uu.uu = apj.col.lb + temp / apj.val;
                }
                else if (apj.val <= -eps)
                {  /* l'[j] := u[j] + (U[p] - L'[p]) / a[p,j] */
                    apj.col.ll.ll = apj.col.ub + temp / apj.val;
                }
                }
            }
            else
            {  /* temp = U[p,k] */
                if (apk.val >= +eps)
                {  /* u'[k] := U[p,k] / a[p,k] */
                    apk.col.uu.uu = temp / apk.val;
                }
                else if (apk.val <= -eps)
                {  /* l'[k] := U[p,k] / a[p,k] */
                    apk.col.ll.ll = temp / apk.val;
                }
            }
        }
    }
}


function npp_binarize_prob(npp){
    /* binarize MIP problem */
    var info;
    var row;
    var col, bin;
    var aij;
    var u, n, k, temp, nfails, nvars, nbins, nrows;
    /* new variables will be added to the end of the column list, so
     we go from the end to beginning of the column list */
    nfails = nvars = nbins = nrows = 0;
    for (col = npp.c_tail; col != null; col = col.prev)
    {  /* skip continuous variable */
        if (!col.is_int) continue;
        /* skip fixed variable */
        if (col.lb == col.ub) continue;
        /* skip binary variable */
        if (col.lb == 0.0 && col.ub == 1.0) continue;
        /* check if the transformation is applicable */
        if (col.lb < -1e6 || col.ub > +1e6 ||
            col.ub - col.lb > 4095.0)
        {  /* unfortunately, not */
            nfails++;
            continue;
        }
        /* process integer non-binary variable x[q] */
        nvars++;
        /* make x[q] non-negative, if its lower bound is non-zero */
        if (col.lb != 0.0)
            npp_lbnd_col(npp, col);
        /* now 0 <= x[q] <= u[q] */
        xassert(col.lb == 0.0);
        u = col.ub;
        xassert(col.ub == u);
        /* if x[q] is binary, further processing is not needed */
        if (u == 1) continue;
        /* determine smallest n such that u <= 2^n - 1 (thus, n is the
         number of binary variables needed) */
        n = 2; temp = 4;
        while (u >= temp){
            n++; temp += temp;
        }
        nbins += n;
        /* create transformation stack entry */
        info = npp_push_tse(npp,
            function (npp, info)
            {     /* recovery binarized variable */
                var k, temp;
                /* compute value of x[q]; see formula (3) */
                var sum = npp.c_value[info.q];
                for (k = 1, temp = 2; k < info.n; k++, temp += temp)
                    sum += temp * npp.c_value[info.j + (k-1)];
                npp.c_value[info.q] = sum;
                return 0;
            }
        );
        info.q = col.j;
        info.j = 0; /* will be set below */
        info.n = n;
        /* if u < 2^n - 1, we need one additional row for (4) */
        if (u < temp - 1)
        {  row = npp_add_row(npp); nrows++;
            row.lb = -DBL_MAX; row.ub = u;
        }
        else
            row = null;
        /* in the transformed problem variable x[q] becomes binary
         variable x[0], so its objective and constraint coefficients
         are not changed */
        col.ub = 1.0;
        /* include x[0] into constraint (4) */
        if (row != null)
            npp_add_aij(row, col, 1.0);
        /* add other binary variables x[1], ..., x[n-1] */
        for (k = 1, temp = 2; k < n; k++, temp += temp)
        {  /* add new binary variable x[k] */
            bin = npp_add_col(npp);
            bin.is_int = 1;
            bin.lb = 0.0; bin.ub = 1.0;
            bin.coef = temp * col.coef;
            /* store column reference number for x[1] */
            if (info.j == 0)
                info.j = bin.j;
            else
                xassert(info.j + (k-1) == bin.j);
            /* duplicate constraint coefficients for x[k]; this also
             automatically includes x[k] into constraint (4) */
            for (aij = col.ptr; aij != null; aij = aij.c_next)
                npp_add_aij(aij.row, bin, temp * aij.val);
        }
    }
    if (nvars > 0)
        xprintf(nvars + " integer variable(s) were replaced by " + nbins + " binary ones");
    if (nrows > 0)
        xprintf(nrows + " row(s) were added due to binarization");
    if (nfails > 0)
        xprintf("Binarization failed for " + nfails + " integer variable(s)");
    return nfails;
}

function copy_form(row, s){
    /* copy linear form */
    var aij;
    var ptr, e;
    ptr = null;
    for (aij = row.ptr; aij != null; aij = aij.r_next)
    {  e = {};
        e.aj = s * aij.val;
        e.xj = aij.col;
        e.next = ptr;
        ptr = e;
    }
    return ptr;
}

function npp_is_packing(npp, row){
    /* test if constraint is packing inequality */
    var col;
    var aij;
    var b;
    xassert(npp == npp);
    if (!(row.lb == -DBL_MAX && row.ub != +DBL_MAX))
        return 0;
    b = 1;
    for (aij = row.ptr; aij != null; aij = aij.r_next)
    {  col = aij.col;
        if (!(col.is_int && col.lb == 0.0 && col.ub == 1.0))
            return 0;
        if (aij.val == +1.0){

        }
        else if (aij.val == -1.0)
            b--;
        else
            return 0;
    }
    if (row.ub != b) return 0;
    return 1;
}

function hidden_packing(npp, ptr, b, callback)
{     /* process inequality constraint: sum a[j] x[j] <= b;
 0 - specified row is NOT hidden packing inequality;
 1 - specified row is packing inequality;
 2 - specified row is hidden packing inequality. */
    var e, ej, ek;
    var neg;
    var eps;
    xassert(npp == npp);
    /* a[j] must be non-zero, x[j] must be binary, for all j in J */
    for (e = ptr; e != null; e = e.next)
    {  xassert(e.aj != 0.0);
        xassert(e.xj.is_int);
        xassert(e.xj.lb == 0.0 && e.xj.ub == 1.0);
    }
    /* check if the specified inequality constraint already has the
     form of packing inequality */
    neg = 0; /* neg is |Jn| */
    for (e = ptr; e != null; e = e.next)
    {  if (e.aj == +1.0){
        
    }
    else if (e.aj == -1.0)
        neg++;
    else
        break;
    }
    if (e == null)
    {  /* all coefficients a[j] are +1 or -1; check rhs b */
        if (b == (1 - neg))
        {  /* it is packing inequality; no processing is needed */
            return 1;
        }
    }
    /* substitute x[j] = 1 - x~[j] for all j in Jn to make all a[j]
     positive; the result is a~[j] = |a[j]| and new rhs b */
    for (e = ptr; e != null; e = e.next)
        if (e.aj < 0) b -= e.aj;
    /* now a[j] > 0 for all j in J (actually |a[j]| are used) */
    /* if a[j] > b, skip processing--this case must not appear */
    for (e = ptr; e != null; e = e.next)
        if (Math.abs(e.aj) > b) return 0;
    /* now 0 < a[j] <= b for all j in J */
    /* find two minimal coefficients a[j] and a[k], j != k */
    ej = null;
    for (e = ptr; e != null; e = e.next)
        if (ej == null || Math.abs(ej.aj) > Math.abs(e.aj)) ej = e;
    xassert(ej != null);
    ek = null;
    for (e = ptr; e != null; e = e.next)
        if (e != ej)
            if (ek == null || Math.abs(ek.aj) > Math.abs(e.aj)) ek = e;
    xassert(ek != null);
    /* the specified constraint is equivalent to packing inequality
     iff a[j] + a[k] > b + eps */
    eps = 1e-3 + 1e-6 * Math.abs(b);
    if (Math.abs(ej.aj) + Math.abs(ek.aj) <= b + eps) return 0;
    /* perform back substitution x~[j] = 1 - x[j] and construct the
     final equivalent packing inequality in generalized format */
    b = 1.0;
    for (e = ptr; e != null; e = e.next)
    {  if (e.aj > 0.0)
        e.aj = +1.0;
    else /* e.aj < 0.0 */{
        e.aj = -1.0; b -= 1.0
    }
    }
    callback(b);
    return 2;
}

function npp_hidden_packing(npp, row){
    /* identify hidden packing inequality */
    var copy;
    var aij;
    var ptr, e;
    var kase, ret, count = 0;
    var b;
    /* the row must be inequality constraint */
    xassert(row.lb < row.ub);
    for (kase = 0; kase <= 1; kase++)
    {  if (kase == 0)
    {  /* process row upper bound */
        if (row.ub == +DBL_MAX) continue;
        ptr = copy_form(row, +1.0);
        b = + row.ub;
    }
    else
    {  /* process row lower bound */
        if (row.lb == -DBL_MAX) continue;
        ptr = copy_form(row, -1.0);
        b = - row.lb;
    }
        /* now the inequality has the form "sum a[j] x[j] <= b" */
        ret = hidden_packing(npp, ptr, b, function(v){b=v});
        xassert(0 <= ret && ret <= 2);
        if (kase == 1 && ret == 1 || ret == 2)
        {  /* the original inequality has been identified as hidden
         packing inequality */
            count++;
            if (GLP_DEBUG){
                xprintf("Original constraint:");
                for (aij = row.ptr; aij != null; aij = aij.r_next)
                    xprintf(" " + aij.val + " x" + aij.col.j);
                if (row.lb != -DBL_MAX) xprintf(", >= " + row.lb);
                if (row.ub != +DBL_MAX) xprintf(", <= " + row.ub);
                xprintf("");
                xprintf("Equivalent packing inequality:");
                for (e = ptr; e != null; e = e.next)
                    xprintf(" " + (e.aj > 0.0 ? "+" : "-") + "x" + e.xj.j);
                xprintf(", <= " + b + "");
            }
            if (row.lb == -DBL_MAX || row.ub == +DBL_MAX)
            {  /* the original row is single-sided inequality; no copy
             is needed */
                copy = null;
            }
            else
            {  /* the original row is double-sided inequality; we need
             to create its copy for other bound before replacing it
             with the equivalent inequality */
                copy = npp_add_row(npp);
                if (kase == 0)
                {  /* the copy is for lower bound */
                    copy.lb = row.lb; copy.ub = +DBL_MAX;
                }
                else
                {  /* the copy is for upper bound */
                    copy.lb = -DBL_MAX; copy.ub = row.ub;
                }
                /* copy original row coefficients */
                for (aij = row.ptr; aij != null; aij = aij.r_next)
                    npp_add_aij(copy, aij.col, aij.val);
            }
            /* replace the original inequality by equivalent one */
            npp_erase_row(row);
            row.lb = -DBL_MAX; row.ub = b;
            for (e = ptr; e != null; e = e.next)
                npp_add_aij(row, e.xj, e.aj);
            /* continue processing lower bound for the copy */
            if (copy != null) row = copy;
        }
    }
    return count;
}

function npp_implied_packing(row, which, var_, set_){
    var ptr, e, i, k;
    var len = 0;
    var b, eps;
    /* build inequality (3) */
    if (which == 0)
    {  ptr = copy_form(row, -1.0);
        xassert(row.lb != -DBL_MAX);
        b = - row.lb;
    }
    else if (which == 1)
    {  ptr = copy_form(row, +1.0);
        xassert(row.ub != +DBL_MAX);
        b = + row.ub;
    }
    /* remove non-binary variables to build relaxed inequality (5);
     compute its right-hand side b~ with formula (6) */
    for (e = ptr; e != null; e = e.next)
    {  if (!(e.xj.is_int && e.xj.lb == 0.0 && e.xj.ub == 1.0))
    {  /* x[j] is non-binary variable */
        if (e.aj > 0.0)
        {  if (e.xj.lb == -DBL_MAX) return len;
            b -= e.aj * e.xj.lb;
        }
        else /* e.aj < 0.0 */
        {  if (e.xj.ub == +DBL_MAX) return len;
            b -= e.aj * e.xj.ub;
        }
        /* a[j] = 0 means that variable x[j] is removed */
        e.aj = 0.0;
    }
    }
    /* substitute x[j] = 1 - x~[j] to build knapsack inequality (8);
     compute its right-hand side beta with formula (11) */
    for (e = ptr; e != null; e = e.next)
        if (e.aj < 0.0) b -= e.aj;
    /* if beta is close to zero, the knapsack inequality is either
     infeasible or forcing inequality; this must never happen, so
     we skip further analysis */
    if (b < 1e-3) return len;
    /* build set P as well as sets Jp and Jn, and determine x[k] as
     explained above in comments to the routine */
    eps = 1e-3 + 1e-6 * b;
    i = k = null;
    for (e = ptr; e != null; e = e.next)
    {  /* note that alfa[j] = |a[j]| */
        if (Math.abs(e.aj) > 0.5 * (b + eps))
        {  /* alfa[j] > (b + eps) / 2; include x[j] in set P, i.e. in
         set Jp or Jn */
            var_[++len] = e.xj;
            set_[len] = (e.aj > 0.0 ? 0 : 1);
            /* alfa[i] = min alfa[j] over all j included in set P */
            if (i == null || Math.abs(i.aj) > Math.abs(e.aj)) i = e;
        }
        else if (Math.abs(e.aj) >= 1e-3)
        {  /* alfa[k] = max alfa[j] over all j not included in set P;
         we skip coefficient a[j] if it is close to zero to avoid
         numerically unreliable results */
            if (k == null || Math.abs(k.aj) < Math.abs(e.aj)) k = e;
        }
    }
    /* if alfa[k] satisfies to condition (13) for all j in P, include
     x[k] in P */
    if (i != null && k != null && Math.abs(i.aj) + Math.abs(k.aj) > b + eps)
    {  var_[++len] = k.xj;
        set_[len] = (k.aj > 0.0 ? 0 : 1);
    }
    /* trivial packing inequality being redundant must never appear,
     so we just ignore it */
    if (len < 2) len = 0;
    return len;

}

function npp_is_covering(npp, row){
    /* test if constraint is covering inequality */
    var col;
    var aij;
    var b;
    xassert(npp == npp);
    if (!(row.lb != -DBL_MAX && row.ub == +DBL_MAX))
        return 0;
    b = 1;
    for (aij = row.ptr; aij != null; aij = aij.r_next)
    {  col = aij.col;
        if (!(col.is_int && col.lb == 0.0 && col.ub == 1.0))
            return 0;
        if (aij.val == +1.0){

        }
        else if (aij.val == -1.0)
            b--;
        else
            return 0;
    }
    if (row.lb != b) return 0;
    return 1;
}

function hidden_covering(npp, ptr, b, callback)
{     /* process inequality constraint: sum a[j] x[j] >= b;
 0 - specified row is NOT hidden covering inequality;
 1 - specified row is covering inequality;
 2 - specified row is hidden covering inequality. */
    var e;
    var neg;
    var eps;
    xassert(npp == npp);
    /* a[j] must be non-zero, x[j] must be binary, for all j in J */
    for (e = ptr; e != null; e = e.next)
    {  xassert(e.aj != 0.0);
        xassert(e.xj.is_int);
        xassert(e.xj.lb == 0.0 && e.xj.ub == 1.0);
    }
    /* check if the specified inequality constraint already has the
     form of covering inequality */
    neg = 0; /* neg is |Jn| */
    for (e = ptr; e != null; e = e.next)
    {  if (e.aj == +1.0){

    }
    else if (e.aj == -1.0)
        neg++;
    else
        break;
    }
    if (e == null)
    {  /* all coefficients a[j] are +1 or -1; check rhs b */
        if (b == (1 - neg))
        {  /* it is covering inequality; no processing is needed */
            return 1;
        }
    }
    /* substitute x[j] = 1 - x~[j] for all j in Jn to make all a[j]
     positive; the result is a~[j] = |a[j]| and new rhs b */
    for (e = ptr; e != null; e = e.next)
        if (e.aj < 0) b -= e.aj;
    /* now a[j] > 0 for all j in J (actually |a[j]| are used) */
    /* if b <= 0, skip processing--this case must not appear */
    if (b < 1e-3) return 0;
    /* now a[j] > 0 for all j in J, and b > 0 */
    /* the specified constraint is equivalent to covering inequality
     iff a[j] >= b for all j in J */
    eps = 1e-9 + 1e-12 * Math.abs(b);
    for (e = ptr; e != null; e = e.next)
        if (Math.abs(e.aj) < b - eps) return 0;
    /* perform back substitution x~[j] = 1 - x[j] and construct the
     final equivalent covering inequality in generalized format */
    b = 1.0;
    for (e = ptr; e != null; e = e.next)
    {  if (e.aj > 0.0)
        e.aj = +1.0;
    else /* e.aj < 0.0 */{
        e.aj = -1.0; b -= 1.0;
    }
    }
    callback(b);
    return 2;
}

function npp_hidden_covering(npp, row){
    /* identify hidden covering inequality */
    var copy;
    var aij;
    var ptr, e;
    var kase, ret, count = 0;
    var b;
    /* the row must be inequality constraint */
    xassert(row.lb < row.ub);
    for (kase = 0; kase <= 1; kase++)
    {  if (kase == 0)
    {  /* process row lower bound */
        if (row.lb == -DBL_MAX) continue;
        ptr = copy_form(row, +1.0);
        b = + row.lb;
    }
    else
    {  /* process row upper bound */
        if (row.ub == +DBL_MAX) continue;
        ptr = copy_form(row, -1.0);
        b = - row.ub;
    }
        /* now the inequality has the form "sum a[j] x[j] >= b" */
        ret = hidden_covering(npp, ptr, b, function(v){b=v});
        xassert(0 <= ret && ret <= 2);
        if (kase == 1 && ret == 1 || ret == 2)
        {  /* the original inequality has been identified as hidden
         covering inequality */
            count++;
            if (GLP_DEBUG){
                xprintf("Original constraint:");
                for (aij = row.ptr; aij != null; aij = aij.r_next)
                    xprintf(" " + aij.val + " x" + aij.col.j);
                if (row.lb != -DBL_MAX) xprintf(", >= " + row.lb);
                if (row.ub != +DBL_MAX) xprintf(", <= " + row.ub);
                xprintf("");
                xprintf("Equivalent covering inequality:");
                for (e = ptr; e != null; e = e.next)
                    xprintf(" " + (e.aj > 0.0 ? "+" : "-") + "x" + e.xj.j);
                xprintf(", >= " + b + "");
            }
            if (row.lb == -DBL_MAX || row.ub == +DBL_MAX)
            {  /* the original row is single-sided inequality; no copy
             is needed */
                copy = null;
            }
            else
            {  /* the original row is double-sided inequality; we need
             to create its copy for other bound before replacing it
             with the equivalent inequality */
                copy = npp_add_row(npp);
                if (kase == 0)
                {  /* the copy is for upper bound */
                    copy.lb = -DBL_MAX; copy.ub = row.ub;
                }
                else
                {  /* the copy is for lower bound */
                    copy.lb = row.lb; copy.ub = +DBL_MAX;
                }
                /* copy original row coefficients */
                for (aij = row.ptr; aij != null; aij = aij.r_next)
                    npp_add_aij(copy, aij.col, aij.val);
            }
            /* replace the original inequality by equivalent one */
            npp_erase_row(row);
            row.lb = b; row.ub = +DBL_MAX;
            for (e = ptr; e != null; e = e.next)
                npp_add_aij(row, e.xj, e.aj);
            /* continue processing upper bound for the copy */
            if (copy != null) row = copy;
        }
    }
    return count;
}

function npp_is_partitioning(npp, row){
    /* test if constraint is partitioning equality */
    var col;
    var aij;
    var b;
    xassert(npp == npp);
    if (row.lb != row.ub) return 0;
    b = 1;
    for (aij = row.ptr; aij != null; aij = aij.r_next)
    {  col = aij.col;
        if (!(col.is_int && col.lb == 0.0 && col.ub == 1.0))
            return 0;
        if (aij.val == +1.0){

        }
        else if (aij.val == -1.0)
            b--;
        else
            return 0;
    }
    if (row.lb != b) return 0;
    return 1;
}

function reduce_ineq_coef(npp, ptr, b, callback)
{     /* process inequality constraint: sum a[j] x[j] >= b */
    /* returns: the number of coefficients reduced */
    var e;
    var count = 0;
    var h, inf_t, new_a;
    xassert(npp == npp);
    /* compute h; see (15) */
    h = 0.0;
    for (e = ptr; e != null; e = e.next)
    {  if (e.aj > 0.0)
    {  if (e.xj.lb == -DBL_MAX) return count;
        h += e.aj * e.xj.lb;
    }
    else /* e.aj < 0.0 */
    {  if (e.xj.ub == +DBL_MAX) return count;
        h += e.aj * e.xj.ub;
    }
    }
    /* perform reduction of coefficients at binary variables */
    for (e = ptr; e != null; e = e.next)
    {  /* skip non-binary variable */
        if (!(e.xj.is_int && e.xj.lb == 0.0 && e.xj.ub == 1.0))
            continue;
        if (e.aj > 0.0)
        {  /* compute inf t[k]; see (14) */
            inf_t = h;
            if (b - e.aj < inf_t && inf_t < b)
            {  /* compute reduced coefficient a'[k]; see (7) */
                new_a = b - inf_t;
                if (new_a >= +1e-3 &&
                    e.aj - new_a >= 0.01 * (1.0 + e.aj))
                {  /* accept a'[k] */
                    if (GLP_DEBUG){xprintf("+")}
                    e.aj = new_a;
                    count++;
                }
            }
        }
        else /* e.aj < 0.0 */
        {  /* compute inf t[k]; see (14) */
            inf_t = h - e.aj;
            if (b < inf_t && inf_t < b - e.aj)
            {  /* compute reduced coefficient a'[k]; see (11) */
                new_a = e.aj + (inf_t - b);
                if (new_a <= -1e-3 &&
                    new_a - e.aj >= 0.01 * (1.0 - e.aj))
                {  /* accept a'[k] */
                    if (GLP_DEBUG){xprintf("-")}
                    e.aj = new_a;
                    /* update h; see (17) */
                    h += (inf_t - b);
                    /* compute b'; see (9) */
                    b = inf_t;
                    count++;
                }
            }
        }
    }
    callback(b);
    return count
}

function npp_reduce_ineq_coef(npp, row){
    /* reduce inequality constraint coefficients */
    var copy;
    var aij;
    var ptr, e;
    var kase, count = new Array(2);
    var b;
    /* the row must be inequality constraint */
    xassert(row.lb < row.ub);
    count[0] = count[1] = 0;
    for (kase = 0; kase <= 1; kase++)
    {  if (kase == 0)
    {  /* process row lower bound */
        if (row.lb == -DBL_MAX) continue;
        if (GLP_DEBUG){xprintf("L")}
        ptr = copy_form(row, +1.0);
        b = + row.lb;
    }
    else
    {  /* process row upper bound */
        if (row.ub == +DBL_MAX) continue;
        if (GLP_DEBUG){xprintf("U")}
        ptr = copy_form(row, -1.0);
        b = - row.ub;
    }
        /* now the inequality has the form "sum a[j] x[j] >= b" */
        count[kase] = reduce_ineq_coef(npp, ptr, b, function(v){b=v});
        if (count[kase] > 0)
        {  /* the original inequality has been replaced by equivalent
         one with coefficients reduced */
            if (row.lb == -DBL_MAX || row.ub == +DBL_MAX)
            {  /* the original row is single-sided inequality; no copy
             is needed */
                copy = null;
            }
            else
            {  /* the original row is double-sided inequality; we need
             to create its copy for other bound before replacing it
             with the equivalent inequality */
                if (GLP_DEBUG){xprintf("*")}
                copy = npp_add_row(npp);
                if (kase == 0)
                {  /* the copy is for upper bound */
                    copy.lb = -DBL_MAX; copy.ub = row.ub;
                }
                else
                {  /* the copy is for lower bound */
                    copy.lb = row.lb; copy.ub = +DBL_MAX;
                }
                /* copy original row coefficients */
                for (aij = row.ptr; aij != null; aij = aij.r_next)
                    npp_add_aij(copy, aij.col, aij.val);
            }
            /* replace the original inequality by equivalent one */
            npp_erase_row(row);
            row.lb = b; row.ub = +DBL_MAX;
            for (e = ptr; e != null; e = e.next)
                npp_add_aij(row, e.xj, e.aj);
            /* continue processing upper bound for the copy */
            if (copy != null) row = copy;
        }
    }
    return count[0] + count[1];
}


function npp_clean_prob(npp){
    /* perform initial LP/MIP processing */
    var row, next_row;
    var col, next_col;
    var ret;
    xassert(npp == npp);
    /* process rows which originally are free */
    for (row = npp.r_head; row != null; row = next_row)
    {  next_row = row.next;
        if (row.lb == -DBL_MAX && row.ub == +DBL_MAX)
        {  /* process free row */
            if (GLP_DEBUG){xprintf("1")}
            npp_free_row(npp, row);
            /* row was deleted */
        }
    }
    /* process rows which originally are double-sided inequalities */
    for (row = npp.r_head; row != null; row = next_row)
    {  next_row = row.next;
        if (row.lb != -DBL_MAX && row.ub != +DBL_MAX &&
            row.lb < row.ub)
        {  ret = npp_make_equality(npp, row);
            if (ret == 1)
            {  /* row was replaced by equality constraint */
                if (GLP_DEBUG){xprintf("2")}
            }
            else
                xassert(ret != ret);
        }
    }
    /* process columns which are originally fixed */
    for (col = npp.c_head; col != null; col = next_col)
    {  next_col = col.next;
        if (col.lb == col.ub)
        {  /* process fixed column */
            if (GLP_DEBUG){xprintf("3")}
            npp_fixed_col(npp, col);
            /* column was deleted */
        }
    }
    /* process columns which are originally double-bounded */
    for (col = npp.c_head; col != null; col = next_col)
    {  next_col = col.next;
        if (col.lb != -DBL_MAX && col.ub != +DBL_MAX &&
            col.lb < col.ub)
        {  ret = npp_make_fixed(npp, col);
            if (ret == 0){

            }
            else if (ret == 1)
            {  /* column was replaced by fixed column; process it */
                if (GLP_DEBUG){xprintf("4")}
                npp_fixed_col(npp, col);
                /* column was deleted */
            }
        }
    }
}

function npp_process_row(npp, row, hard){
    /* perform basic row processing */
    var col;
    var aij, next_aij, aaa;
    var ret;
    /* row must not be free */
    xassert(!(row.lb == -DBL_MAX && row.ub == +DBL_MAX));
    /* start processing row */
    if (row.ptr == null)
    {  /* empty row */
        ret = npp_empty_row(npp, row);
        if (ret == 0)
        {  /* row was deleted */
            if (GLP_DEBUG){xprintf("A")}
            return 0;
        }
        else if (ret == 1)
        {  /* primal infeasibility */
            return GLP_ENOPFS;
        }
        else
            xassert(ret != ret);
    }
    if (row.ptr.r_next == null)
    {  /* row singleton */
        col = row.ptr.col;
        if (row.lb == row.ub)
        {  /* equality constraint */
            ret = npp_eq_singlet(npp, row);
            if (ret == 0)
            {  /* column was fixed, row was deleted */
                if (GLP_DEBUG){xprintf("B")}
                /* activate rows affected by column */
                for (aij = col.ptr; aij != null; aij = aij.c_next)
                    npp_activate_row(npp, aij.row);
                /* process fixed column */
                npp_fixed_col(npp, col);
                /* column was deleted */
                return 0;
            }
            else if (ret == 1 || ret == 2)
            {  /* primal/integer infeasibility */
                return GLP_ENOPFS;
            }
            else
                xassert(ret != ret);
        }
        else
        {  /* inequality constraint */
            ret = npp_ineq_singlet(npp, row);
            if (0 <= ret && ret <= 3)
            {  /* row was deleted */
                if (GLP_DEBUG){xprintf("C")}
                /* activate column, since its length was changed due to
                 row deletion */
                npp_activate_col(npp, col);
                if (ret >= 2)
                {  /* column bounds changed significantly or column was
                 fixed */
                    /* activate rows affected by column */
                    for (aij = col.ptr; aij != null; aij = aij.c_next)
                        npp_activate_row(npp, aij.row);
                }
                if (ret == 3)
                {  /* column was fixed; process it */
                    if (GLP_DEBUG){xprintf("D")}
                    npp_fixed_col(npp, col);
                    /* column was deleted */
                }
                return 0;
            }
            else if (ret == 4)
            {  /* primal infeasibility */
                return GLP_ENOPFS;
            }
            else
                xassert(ret != ret);
        }
    }
    /* general row analysis */
    ret = npp_analyze_row(npp, row);
    xassert(0x00 <= ret && ret <= 0xFF);
    if (ret == 0x33)
    {  /* row bounds are inconsistent with column bounds */
        return GLP_ENOPFS;
    }
    if ((ret & 0x0F) == 0x00)
    {  /* row lower bound does not exist or redundant */
        if (row.lb != -DBL_MAX)
        {  /* remove redundant row lower bound */
            if (GLP_DEBUG){xprintf("F")}
            npp_inactive_bound(npp, row, 0);
        }
    }
    else if ((ret & 0x0F) == 0x01)
    {  /* row lower bound can be active */
        /* see below */
    }
    else if ((ret & 0x0F) == 0x02)
    {  /* row lower bound is a forcing bound */
        if (GLP_DEBUG){xprintf("G")}
        /* process forcing row */
        if (npp_forcing_row(npp, row, 0) == 0)
            return fixup();
    }
    else
        xassert(ret != ret);
    if ((ret & 0xF0) == 0x00)
    {  /* row upper bound does not exist or redundant */
        if (row.ub != +DBL_MAX)
        {  /* remove redundant row upper bound */
            if (GLP_DEBUG){xprintf("I")}
            npp_inactive_bound(npp, row, 1);
        }
    }
    else if ((ret & 0xF0) == 0x10)
    {  /* row upper bound can be active */
        /* see below */
    }
    else if ((ret & 0xF0) == 0x20)
    {  /* row upper bound is a forcing bound */
        if (GLP_DEBUG) {xprintf("J")}
        /* process forcing row */
        if (npp_forcing_row(npp, row, 1) == 0) return fixup();
    }
    else
        xassert(ret != ret);
    if (row.lb == -DBL_MAX && row.ub == +DBL_MAX)
    {  /* row became free due to redundant bounds removal */
        if (GLP_DEBUG) {xprintf("K")}
        /* activate its columns, since their length will change due
         to row deletion */
        for (aij = row.ptr; aij != null; aij = aij.r_next)
            npp_activate_col(npp, aij.col);
        /* process free row */
        npp_free_row(npp, row);
        /* row was deleted */
        return 0;
    }
    /* row lower and/or upper bounds can be active */
    if (npp.sol == GLP_MIP && hard)
    {  /* improve current column bounds (optional) */
        if (npp_improve_bounds(npp, row, 1) < 0)
            return GLP_ENOPFS;
    }
    function fixup()   {  /* columns were fixed, row was made free */
        for (aij = row.ptr; aij != null; aij = next_aij)
        {  /* process column fixed by forcing row */
            if (GLP_DEBUG){xprintf("H")}
            col = aij.col;
            next_aij = aij.r_next;
            /* activate rows affected by column */
            for (aaa = col.ptr; aaa != null; aaa = aaa.c_next)
                npp_activate_row(npp, aaa.row);
            /* process fixed column */
            npp_fixed_col(npp, col);
            /* column was deleted */
        }
        /* process free row (which now is empty due to deletion of
         all its columns) */
        npp_free_row(npp, row);
        /* row was deleted */
        return 0;
    }
    return 0;
}

function npp_improve_bounds(npp, row, flag){
    /* improve current column bounds */
    var col;
    var aij, next_aij, aaa;
    var kase, ret, count = 0;
    var lb, ub;
    xassert(npp.sol == GLP_MIP);
    /* row must not be free */
    xassert(!(row.lb == -DBL_MAX && row.ub == +DBL_MAX));
    /* determine implied column bounds */
    npp_implied_bounds(npp, row);
    /* and use these bounds to strengthen current column bounds */
    for (aij = row.ptr; aij != null; aij = next_aij)
    {  col = aij.col;
        next_aij = aij.r_next;
        for (kase = 0; kase <= 1; kase++)
        {  /* save current column bounds */
            lb = col.lb; ub = col.ub;
            if (kase == 0)
            {  /* process implied column lower bound */
                if (col.ll.ll == -DBL_MAX) continue;
                ret = npp_implied_lower(npp, col, col.ll.ll);
            }
            else
            {  /* process implied column upper bound */
                if (col.uu.uu == +DBL_MAX) continue;
                ret = npp_implied_upper(npp, col, col.uu.uu);
            }
            if (ret == 0 || ret == 1)
            {  /* current column bounds did not change or changed, but
             not significantly; restore current column bounds */
                col.lb = lb; col.ub = ub;
            }
            else if (ret == 2 || ret == 3)
            {  /* current column bounds changed significantly or column
             was fixed */
                if (GLP_DEBUG){xprintf("L")}
                count++;
                /* activate other rows affected by column, if required */
                if (flag)
                {  for (aaa = col.ptr; aaa != null; aaa = aaa.c_next)
                {  if (aaa.row != row)
                    npp_activate_row(npp, aaa.row);
                }
                }
                if (ret == 3)
                {  /* process fixed column */
                    if (GLP_DEBUG){xprintf("M")}
                    npp_fixed_col(npp, col);
                    /* column was deleted */
                    break; /* for kase */
                }
            }
            else if (ret == 4)
            {  /* primal/integer infeasibility */
                return -1;
            }
            else
                xassert(ret != ret);
        }
    }
    return count;
}

function npp_process_col(npp, col)
{     /* perform basic column processing */
    var row;
    var aij;
    var ret;
    /* column must not be fixed */
    xassert(col.lb < col.ub);
    /* start processing column */
    if (col.ptr == null)
    {  /* empty column */
        ret = npp_empty_col(npp, col);
        if (ret == 0)
        {  /* column was fixed and deleted */
            if (GLP_DEBUG){xprintf("N")}
            return 0;
        }
        else if (ret == 1)
        {  /* dual infeasibility */
            return GLP_ENODFS;
        }
        else
            xassert(ret != ret);
    }
    if (col.ptr.c_next == null)
    {  /* column singleton */
        row = col.ptr.row;


        function slack(){  /* implied slack variable */
            if (GLP_DEBUG) {xprintf("O")}
            npp_implied_slack(npp, col);
            /* column was deleted */
            if (row.lb == -DBL_MAX && row.ub == +DBL_MAX)
            {  /* row became free due to implied slack variable */
                if (GLP_DEBUG){xprintf("P")}
                /* activate columns affected by row */
                for (aij = row.ptr; aij != null; aij = aij.r_next)
                    npp_activate_col(npp, aij.col);
                /* process free row */
                npp_free_row(npp, row);
                /* row was deleted */
            }
            else
            {  /* row became inequality constraint; activate it
             since its length changed due to column deletion */
                npp_activate_row(npp, row);
            }
            return 0;
        }

        if (row.lb == row.ub)
        {  /* equality constraint */
            if (!col.is_int)
                return slack();
        }
        else
        {  /* inequality constraint */
            if (!col.is_int)
            {  ret = npp_implied_free(npp, col);
                if (ret == 0)
                {  /* implied free variable */
                    if (GLP_DEBUG){xprintf("Q")}
                    /* column bounds were removed, row was replaced by
                     equality constraint */
                    return slack();
                }
                else if (ret == 1)
                {  /* column is not implied free variable, because its
                 lower and/or upper bounds can be active */
                }
                else if (ret == 2)
                {  /* dual infeasibility */
                    return GLP_ENODFS;
                }
            }
        }
    }
    /* column still exists */
    return 0;
}

function npp_process_prob(npp, hard){
    /* perform basic LP/MIP processing */
    var row;
    var col;
    var processing, ret;
    /* perform initial LP/MIP processing */
    npp_clean_prob(npp);
    /* activate all remaining rows and columns */
    for (row = npp.r_head; row != null; row = row.next)
        row.temp = 1;
    for (col = npp.c_head; col != null; col = col.next)
        col.temp = 1;
    /* main processing loop */
    processing = 1;
    while (processing)
    {  processing = 0;
        /* process all active rows */
        for (;;)
        {  row = npp.r_head;
            if (row == null || !row.temp) break;
            npp_deactivate_row(npp, row);
            ret = npp_process_row(npp, row, hard);
            if (ret != 0) return done();
            processing = 1;
        }
        /* process all active columns */
        for (;;)
        {  col = npp.c_head;
            if (col == null || !col.temp) break;
            npp_deactivate_col(npp, col);
            ret = npp_process_col(npp, col);
            if (ret != 0) return done();
            processing = 1;
        }
    }
    if (npp.sol == GLP_MIP && !hard)
    {  /* improve current column bounds (optional) */
        for (row = npp.r_head; row != null; row = row.next)
        {  if (npp_improve_bounds(npp, row, 0) < 0)
        {  ret = GLP_ENOPFS;
            return done();
        }
        }
    }
    /* all seems ok */
    ret = 0;
    function done(){
        xassert(ret == 0 || ret == GLP_ENOPFS || ret == GLP_ENODFS);
        if (GLP_DEBUG){xprintf("")}
        return ret;
    }
    return done();
}

function npp_simplex(npp, parm){
    /* process LP prior to applying primal/dual simplex method */
    xassert(npp.sol == GLP_SOL);
    xassert(parm == parm);
    return npp_process_prob(npp, 0);
}

function npp_integer(npp, parm){
    /* process MIP prior to applying branch-and-bound method */
    var row, prev_row;
    var col;
    var aij;
    var count, ret;
    xassert(npp.sol == GLP_MIP);
    xassert(parm == parm);
    /*==============================================================*/
    /* perform basic MIP processing */
    ret = npp_process_prob(npp, 1);
    if (ret != 0) return ret;
    /*==============================================================*/
    /* binarize problem, if required */
    if (parm.binarize)
        npp_binarize_prob(npp);
    /*==============================================================*/
    /* identify hidden packing inequalities */
    count = 0;
    /* new rows will be added to the end of the row list, so we go
     from the end to beginning of the row list */
    for (row = npp.r_tail; row != null; row = prev_row)
    {  prev_row = row.prev;
        /* skip free row */
        if (row.lb == -DBL_MAX && row.ub == +DBL_MAX) continue;
        /* skip equality constraint */
        if (row.lb == row.ub) continue;
        /* skip row having less than two variables */
        if (row.ptr == null || row.ptr.r_next == null) continue;
        /* skip row having non-binary variables */
        for (aij = row.ptr; aij != null; aij = aij.r_next)
        {  col = aij.col;
            if (!(col.is_int && col.lb == 0.0 && col.ub == 1.0))
                break;
        }
        if (aij != null) continue;
        count += npp_hidden_packing(npp, row);
    }
    if (count > 0)
        xprintf(count + " hidden packing inequaliti(es) were detected");
    /*==============================================================*/
    /* identify hidden covering inequalities */
    count = 0;
    /* new rows will be added to the end of the row list, so we go
     from the end to beginning of the row list */
    for (row = npp.r_tail; row != null; row = prev_row)
    {  prev_row = row.prev;
        /* skip free row */
        if (row.lb == -DBL_MAX && row.ub == +DBL_MAX) continue;
        /* skip equality constraint */
        if (row.lb == row.ub) continue;
        /* skip row having less than three variables */
        if (row.ptr == null || row.ptr.r_next == null ||
            row.ptr.r_next.r_next == null) continue;
        /* skip row having non-binary variables */
        for (aij = row.ptr; aij != null; aij = aij.r_next)
        {  col = aij.col;
            if (!(col.is_int && col.lb == 0.0 && col.ub == 1.0))
                break;
        }
        if (aij != null) continue;
        count += npp_hidden_covering(npp, row);
    }
    if (count > 0)
        xprintf(count + " hidden covering inequaliti(es) were detected");
    /*==============================================================*/
    /* reduce inequality constraint coefficients */
    count = 0;
    /* new rows will be added to the end of the row list, so we go
     from the end to beginning of the row list */
    for (row = npp.r_tail; row != null; row = prev_row)
    {  prev_row = row.prev;
        /* skip equality constraint */
        if (row.lb == row.ub) continue;
        count += npp_reduce_ineq_coef(npp, row);
    }
    if (count > 0)
        xprintf(count + " constraint coefficient(s) were reduced");
    /*==============================================================*/
    //if (GLP_DEBUG){routine(npp)}
    /*==============================================================*/
    /* all seems ok */
    ret = 0;
    return ret;
}


function mod_diff(x, y) {return (x - y) & 0x7FFFFFFF}
/* difference modulo 2^31 */

function flip_cycle(rand){
/* this is an auxiliary routine to do 55 more steps of the basic
 recurrence, at high speed, and to reset fptr */
    var ii, jj;
    for (ii = 1, jj = 32; jj <= 55; ii++, jj++)
        rand.A[ii] = mod_diff(rand.A[ii], rand.A[jj]);
    for (jj = 1; ii <= 55; ii++, jj++)
        rand.A[ii] = mod_diff(rand.A[ii], rand.A[jj]);
    rand.fptr = 54;
    return rand.A[55];
}

function rng_create_rand(){
    var rand = {};
    var i;
    rand.A = new Array(56);
    rand.A[0] = -1;
    for (i = 1; i <= 55; i++) rand.A[i] = 0;
    (rand.fptr) = 0;
    rng_init_rand(rand, 1);
    return rand;
}

function rng_init_rand(rand, seed){
    var i;
    var prev = seed, next = 1;
    seed = prev = mod_diff(prev, 0);
    rand.A[55] = prev;
    for (i = 21; i; i = (i + 21) % 55)
    {  rand.A[i] = next;
        next = mod_diff(prev, next);
        if (seed & 1)
            seed = 0x40000000 + (seed >> 1);
        else
            seed >>= 1;
        next = mod_diff(next, seed);
        prev = rand.A[i];
    }
    flip_cycle(rand);
    flip_cycle(rand);
    flip_cycle(rand);
    flip_cycle(rand);
    flip_cycle(rand);
}

function rng_next_rand(rand){
    return rand.A[rand.fptr] >= 0 ? rand.A[rand.fptr--] : flip_cycle(rand);
}

function rng_unif_rand(rand, m){
    const two_to_the_31 = 0x80000000;
    var t = two_to_the_31 - (two_to_the_31 % m);
    var r;
    xassert(m > 0);
    do { r = rng_next_rand(rand); } while (t <= r);
    return r % m;
}

function rng_unif_01(rand){
    var x = rng_next_rand(rand) / 2147483647.0;
    xassert(0.0 <= x && x <= 1.0);
    return x;
}

function rng_uniform(rand, a, b){
    if (a >= b)
        xerror("rng_uniform: a = " + a + ", b = " + b + "; invalid range");
    var x = rng_unif_01(rand);
    x = a * (1.0 - x) + b * x;
    xassert(a <= x && x <= b);
    return x;
}

const
    SCF_TBG     = 1,  /* Bartels-Golub elimination */
    SCF_TGR     = 2;  /* Givens plane rotation */

/* return codes: */
const
    SCF_ESING    = 1,  /* singular matrix */
    SCF_ELIMIT   = 2;  /* update limit reached */

const _GLPSCF_DEBUG = 0;

const SCF_EPS = 1e-10;

function scf_create_it(n_max){
    if (_GLPSCF_DEBUG){
        xprintf("scf_create_it: warning: debug mode enabled");
    }
    if (!(1 <= n_max && n_max <= 32767))
        xerror("scf_create_it: n_max = " + n_max + "; invalid parameter");
    var scf = {};
    scf.n_max = n_max;
    scf.n = 0;
    scf.f = new Array(1 + n_max * n_max);
    scf.u = new Array(1 + n_max * (n_max + 1) / 2);
    scf.p = new Array(1 + n_max);
    scf.t_opt = SCF_TBG;
    scf.rank = 0;
    if (_GLPSCF_DEBUG)
        scf.c = new Array(1 + n_max * n_max);
    else
        scf.c = null;
    scf.w = new Array(1 + n_max);
    return scf;
}

function f_loc(scf, i, j){
    var n_max = scf.n_max;
    var n = scf.n;
    xassert(1 <= i && i <= n);
    xassert(1 <= j && j <= n);
    return (i - 1) * n_max + j;
}

function u_loc(scf, i, j){
    var n_max = scf.n_max;
    var n = scf.n;
    xassert(1 <= i && i <= n);
    xassert(i <= j && j <= n);
    return (i - 1) * n_max + j - i * (i - 1) / 2;
}

function bg_transform(scf, k, un){
    var n = scf.n;
    var f = scf.f;
    var u = scf.u;
    var j, k1, kj, kk, n1, nj;
    var t;
    xassert(1 <= k && k <= n);
    /* main elimination loop */
    for (; k < n; k++)
    {  /* determine location of U[k,k] */
        kk = u_loc(scf, k, k);
        /* determine location of F[k,1] */
        k1 = f_loc(scf, k, 1);
        /* determine location of F[n,1] */
        n1 = f_loc(scf, n, 1);
        /* if |U[k,k]| < |U[n,k]|, interchange k-th and n-th rows to
         provide |U[k,k]| >= |U[n,k]| */
        if (Math.abs(u[kk]) < Math.abs(un[k]))
        {  /* interchange k-th and n-th rows of matrix U */
            for (j = k, kj = kk; j <= n; j++, kj++){
                t = u[kj]; u[kj] = un[j]; un[j] = t;
            }
            /* interchange k-th and n-th rows of matrix F to keep the
             main equality F * C = U * P */
            for (j = 1, kj = k1, nj = n1; j <= n; j++, kj++, nj++){
                t = f[kj]; f[kj] = f[nj]; f[nj] = t;
            }
        }
        /* now |U[k,k]| >= |U[n,k]| */
        /* if U[k,k] is too small in the magnitude, replace U[k,k] and
         U[n,k] by exact zero */
        if (Math.abs(u[kk]) < SCF_EPS) u[kk] = un[k] = 0.0;
        /* if U[n,k] is already zero, elimination is not needed */
        if (un[k] == 0.0) continue;
        /* compute gaussian multiplier t = U[n,k] / U[k,k] */
        t = un[k] / u[kk];
        /* apply gaussian elimination to nullify U[n,k] */
        /* (n-th row of U) := (n-th row of U) - t * (k-th row of U) */
        for (j = k+1, kj = kk+1; j <= n; j++, kj++)
            un[j] -= t * u[kj];
        /* (n-th row of F) := (n-th row of F) - t * (k-th row of F)
         to keep the main equality F * C = U * P */
        for (j = 1, kj = k1, nj = n1; j <= n; j++, kj++, nj++)
            f[nj] -= t * f[kj];
    }
    /* if U[n,n] is too small in the magnitude, replace it by exact
     zero */
    if (Math.abs(un[n]) < SCF_EPS) un[n] = 0.0;
    /* store U[n,n] in a proper location */
    u[u_loc(scf, n, n)] = un[n];
}

function givens(a, b, callback){
    var t, c, s;
    if (b == 0.0){
        c = 1.0; s = 0.0;
    }
    else if (Math.abs(a) <= Math.abs(b)){
        t = - a / b; s = 1.0 / Math.sqrt(1.0 + t * t); c = s * t;
    }
    else{
        t = - b / a; c = 1.0 / Math.sqrt(1.0 + t * t); s = c * t;
    }
    callback(c, s);
}

function gr_transform(scf, k, un){
    var n = scf.n;
    var f = scf.f;
    var u = scf.u;
    var j, k1, kj, kk, n1, nj;
    xassert(1 <= k && k <= n);
    /* main elimination loop */
    for (; k < n; k++)
    {  /* determine location of U[k,k] */
        kk = u_loc(scf, k, k);
        /* determine location of F[k,1] */
        k1 = f_loc(scf, k, 1);
        /* determine location of F[n,1] */
        n1 = f_loc(scf, n, 1);
        /* if both U[k,k] and U[n,k] are too small in the magnitude,
         replace them by exact zero */
        if (Math.abs(u[kk]) < SCF_EPS && Math.abs(un[k]) < SCF_EPS)
            u[kk] = un[k] = 0.0;
        /* if U[n,k] is already zero, elimination is not needed */
        if (un[k] == 0.0) continue;
        /* compute the parameters of Givens plane rotation */
        givens(u[kk], un[k],
            function(c, s){
                /* apply Givens rotation to k-th and n-th rows of matrix U */
                for (j = k, kj = kk; j <= n; j++, kj++)
                {  var ukj = u[kj], unj = un[j];
                    u[kj] = c * ukj - s * unj;
                    un[j] = s * ukj + c * unj;
                }
                /* apply Givens rotation to k-th and n-th rows of matrix F
                 to keep the main equality F * C = U * P */
                for (j = 1, kj = k1, nj = n1; j <= n; j++, kj++, nj++)
                {  var fkj = f[kj], fnj = f[nj];
                    f[kj] = c * fkj - s * fnj;
                    f[nj] = s * fkj + c * fnj;
                }
            }
        );
    }
    /* if U[n,n] is too small in the magnitude, replace it by exact
     zero */
    if (Math.abs(un[n]) < SCF_EPS) un[n] = 0.0;
    /* store U[n,n] in a proper location */
    u[u_loc(scf, n, n)] = un[n];
}

function transform(scf, k, un){
    switch (scf.t_opt){
        case SCF_TBG:
            bg_transform(scf, k, un);
            break;
        case SCF_TGR:
            gr_transform(scf, k, un);
            break;
        default:
            xassert(scf != scf);
    }
}

function estimate_rank(scf){
    var n_max = scf.n_max;
    var n = scf.n;
    var u = scf.u;
    var i, ii, inc, rank = 0;
    for (i = 1, ii = u_loc(scf, i, i), inc = n_max; i <= n; i++, ii += inc, inc--)
        if (u[ii] != 0.0) rank++;
    return rank;
}

if (_GLPSCF_DEBUG){

    function check_error(scf, func){
        var n = scf.n;
        var f = scf.f;
        var u = scf.u;
        var p = scf.p;
        var c = scf.c;
        var i, j, k;
        var d, dmax = 0.0, s, t;
        xassert(c != null);
        for (i = 1; i <= n; i++)
        {  for (j = 1; j <= n; j++)
        {  /* compute element (i,j) of product F * C */
            s = 0.0;
            for (k = 1; k <= n; k++)
                s += f[f_loc(scf, i, k)] * c[f_loc(scf, k, j)];
            /* compute element (i,j) of product U * P */
            k = p[j];
            t = (i <= k ? u[u_loc(scf, i, k)] : 0.0);
            /* compute the maximal relative error */
            d = Math.abs(s - t) / (1.0 + Math.abs(t));
            if (dmax < d) dmax = d;
        }
        }
        if (dmax > 1e-8)
            xprintf(func + ": dmax = " + dmax + "; relative error too large");
    }
}

function scf_update_exp(scf, x, idx, y, idy, z){
    var n_max = scf.n_max;
    var n = scf.n;
    var f = scf.f;
    var u = scf.u;
    var p = scf.p;
    if (_GLPSCF_DEBUG){var c = scf.c}
    var un = scf.w;
    var i, ij, in_, j, k, nj, ret = 0;
    var t;
    /* check if the factorization can be expanded */
    if (n == n_max)
    {  /* there is not enough room */
        ret = SCF_ELIMIT;
        return ret;
    }
    /* increase the order of the factorization */
    scf.n = ++n;
    /* fill new zero column of matrix F */
    for (i = 1, in_ = f_loc(scf, i, n); i < n; i++, in_ += n_max)
    f[in_] = 0.0;
    /* fill new zero row of matrix F */
    for (j = 1, nj = f_loc(scf, n, j); j < n; j++, nj++)
        f[nj] = 0.0;
    /* fill new unity diagonal element of matrix F */
    f[f_loc(scf, n, n)] = 1.0;
    /* compute new column of matrix U, which is (old F) * x */
    for (i = 1; i < n; i++)
    {  /* u[i,n] := (i-th row of old F) * x */
        t = 0.0;
        for (j = 1, ij = f_loc(scf, i, 1); j < n; j++, ij++)
            t += f[ij] * x[j+idx];
        u[u_loc(scf, i, n)] = t;
    }
    /* compute new (spiked) row of matrix U, which is (old P) * y */
    for (j = 1; j < n; j++) un[j] = y[p[j]+idy];
    /* store new diagonal element of matrix U, which is z */
    un[n] = z;
    /* expand matrix P */
    p[n] = n;
    if (_GLPSCF_DEBUG){
        /* expand matrix C */
        /* fill its new column, which is x */
        for (i = 1, in_ = f_loc(scf, i, n); i < n; i++, in_ += n_max)
            c[in_] = x[i+idx];
        /* fill its new row, which is y */
        for (j = 1, nj = f_loc(scf, n, j); j < n; j++, nj++)
            c[nj] = y[j+idy];
        /* fill its new diagonal element, which is z */
        c[f_loc(scf, n, n)] = z;
    }
    /* restore upper triangular structure of matrix U */
    for (k = 1; k < n; k++)
        if (un[k] != 0.0) break;
    transform(scf, k, un);
    /* estimate the rank of matrices C and U */
    scf.rank = estimate_rank(scf);
    if (scf.rank != n) ret = SCF_ESING;
    if (_GLPSCF_DEBUG){
        /* check that the factorization is accurate enough */
        check_error(scf, "scf_update_exp");
    }
    return ret;
}

function solve(scf, x, idx){
    var n = scf.n;
    var f = scf.f;
    var u = scf.u;
    var p = scf.p;
    var y = scf.w;
    var i, j, ij;
    var t;
    /* y := F * b */
    for (i = 1; i <= n; i++)
    {  /* y[i] = (i-th row of F) * b */
        t = 0.0;
        for (j = 1, ij = f_loc(scf, i, 1); j <= n; j++, ij++)
            t += f[ij] * x[j+idx];
        y[i] = t;
    }
    /* y := inv(U) * y */
    for (i = n; i >= 1; i--)
    {  t = y[i];
        for (j = n, ij = u_loc(scf, i, n); j > i; j--, ij--)
            t -= u[ij] * y[j];
        y[i] = t / u[ij];
    }
    /* x := P' * y */
    for (i = 1; i <= n; i++) x[p[i]+idx] = y[i];
}

function tsolve(scf, x, idx){
    var n = scf.n;
    var f = scf.f;
    var u = scf.u;
    var p = scf.p;
    var y = scf.w;
    var i, j, ij;
    var t;
    /* y := P * b */
    for (i = 1; i <= n; i++) y[i] = x[p[i]+idx];
    /* y := inv(U') * y */
    for (i = 1; i <= n; i++)
    {  /* compute y[i] */
        ij = u_loc(scf, i, i);
        t = (y[i] /= u[ij]);
        /* substitute y[i] in other equations */
        for (j = i+1, ij++; j <= n; j++, ij++)
            y[j] -= u[ij] * t;
    }
    /* x := F' * y (computed as linear combination of rows of F) */
    for (j = 1; j <= n; j++) x[j+idx] = 0.0;
    for (i = 1; i <= n; i++)
    {  t = y[i]; /* coefficient of linear combination */
        for (j = 1, ij = f_loc(scf, i, 1); j <= n; j++, ij++)
            x[j+idx] += f[ij] * t;
    }
}

function scf_solve_it(scf, tr, x, idx){
    if (scf.rank < scf.n)
        xerror("scf_solve_it: singular matrix");
    if (!tr)
        solve(scf, x, idx);
    else
        tsolve(scf, x, idx);
}

function scf_reset_it(scf){
    /* reset factorization for empty matrix C */
    scf.n = scf.rank = 0;
}

var glp_scale_prob = exports.glp_scale_prob = function(lp, flags){
    function min_row_aij(lp, i, scaled){
        var aij;
        var min_aij, temp;
        xassert(1 <= i && i <= lp.m);
        min_aij = 1.0;
        for (aij = lp.row[i].ptr; aij != null; aij = aij.r_next)
        {  temp = Math.abs(aij.val);
            if (scaled) temp *= (aij.row.rii * aij.col.sjj);
            if (aij.r_prev == null || min_aij > temp)
                min_aij = temp;
        }
        return min_aij;
    }

    function max_row_aij(lp, i, scaled){
        var aij;
        var max_aij, temp;
        xassert(1 <= i && i <= lp.m);
        max_aij = 1.0;
        for (aij = lp.row[i].ptr; aij != null; aij = aij.r_next)
        {  temp = Math.abs(aij.val);
            if (scaled) temp *= (aij.row.rii * aij.col.sjj);
            if (aij.r_prev == null || max_aij < temp)
                max_aij = temp;
        }
        return max_aij;
    }

    function min_col_aij(lp, j, scaled){
        var aij;
        var min_aij, temp;
        xassert(1 <= j && j <= lp.n);
        min_aij = 1.0;
        for (aij = lp.col[j].ptr; aij != null; aij = aij.c_next)
        {  temp = Math.abs(aij.val);
            if (scaled) temp *= (aij.row.rii * aij.col.sjj);
            if (aij.c_prev == null || min_aij > temp)
                min_aij = temp;
        }
        return min_aij;
    }

    function max_col_aij(lp, j, scaled){
        var aij;
        var max_aij, temp;
        xassert(1 <= j && j <= lp.n);
        max_aij = 1.0;
        for (aij = lp.col[j].ptr; aij != null; aij = aij.c_next)
        {  temp = Math.abs(aij.val);
            if (scaled) temp *= (aij.row.rii * aij.col.sjj);
            if (aij.c_prev == null || max_aij < temp)
                max_aij = temp;
        }
        return max_aij;
    }

    function min_mat_aij(lp, scaled){
        var i;
        var min_aij, temp;
        min_aij = 1.0;
        for (i = 1; i <= lp.m; i++)
        {  temp = min_row_aij(lp, i, scaled);
            if (i == 1 || min_aij > temp)
                min_aij = temp;
        }
        return min_aij;
    }

    function max_mat_aij(lp, scaled){
        var i;
        var max_aij, temp;
        max_aij = 1.0;
        for (i = 1; i <= lp.m; i++)
        {  temp = max_row_aij(lp, i, scaled);
            if (i == 1 || max_aij < temp)
                max_aij = temp;
        }
        return max_aij;
    }

    function eq_scaling(lp, flag){
        var i, j, pass;
        var temp;
        xassert(flag == 0 || flag == 1);
        for (pass = 0; pass <= 1; pass++)
        {  if (pass == flag)
        {  /* scale rows */
            for (i = 1; i <= lp.m; i++)
            {  temp = max_row_aij(lp, i, 1);
                glp_set_rii(lp, i, glp_get_rii(lp, i) / temp);
            }
        }
        else
        {  /* scale columns */
            for (j = 1; j <= lp.n; j++)
            {  temp = max_col_aij(lp, j, 1);
                glp_set_sjj(lp, j, glp_get_sjj(lp, j) / temp);
            }
        }
        }
    }

    function gm_scaling(lp, flag){
        var i, j, pass;
        var temp;
        xassert(flag == 0 || flag == 1);
        for (pass = 0; pass <= 1; pass++)
        {  if (pass == flag)
        {  /* scale rows */
            for (i = 1; i <= lp.m; i++)
            {  temp = min_row_aij(lp, i, 1) * max_row_aij(lp, i, 1);
                glp_set_rii(lp, i, glp_get_rii(lp, i) / Math.sqrt(temp));
            }
        }
        else
        {  /* scale columns */
            for (j = 1; j <= lp.n; j++)
            {  temp = min_col_aij(lp, j, 1) * max_col_aij(lp, j, 1);
                glp_set_sjj(lp, j, glp_get_sjj(lp, j) / Math.sqrt(temp));
            }
        }
        }
    }

    function max_row_ratio(lp){
        var i;
        var ratio, temp;
        ratio = 1.0;
        for (i = 1; i <= lp.m; i++)
        {  temp = max_row_aij(lp, i, 1) / min_row_aij(lp, i, 1);
            if (i == 1 || ratio < temp) ratio = temp;
        }
        return ratio;
    }

    function max_col_ratio(lp){
        var j;
        var ratio, temp;
        ratio = 1.0;
        for (j = 1; j <= lp.n; j++)
        {  temp = max_col_aij(lp, j, 1) / min_col_aij(lp, j, 1);
            if (j == 1 || ratio < temp) ratio = temp;
        }
        return ratio;
    }

    function gm_iterate(lp, it_max, tau){
        var k, flag;
        var ratio = 0.0, r_old;
        /* if the scaling "quality" for rows is better than for columns,
         the rows are scaled first; otherwise, the columns are scaled
         first */
        flag = (max_row_ratio(lp) > max_col_ratio(lp));
        for (k = 1; k <= it_max; k++)
        {  /* save the scaling "quality" from previous iteration */
            r_old = ratio;
            /* determine the current scaling "quality" */
            ratio = max_mat_aij(lp, 1) / min_mat_aij(lp, 1);
            /* if improvement is not enough, terminate scaling */
            if (k > 1 && ratio > tau * r_old) break;
            /* otherwise, perform another iteration */
            gm_scaling(lp, flag);
        }
    }

    function scale_prob(lp, flags){

        function fmt(a, b, c, d){
            return a + ": min|aij| = " + b + "  max|aij| = " + c + "  ratio = " + d + ""
        }

        var min_aij, max_aij, ratio;
        xprintf("Scaling...");
        /* cancel the current scaling effect */
        glp_unscale_prob(lp);
        /* report original scaling "quality" */
        min_aij = min_mat_aij(lp, 1);
        max_aij = max_mat_aij(lp, 1);
        ratio = max_aij / min_aij;
        xprintf(fmt(" A", min_aij, max_aij, ratio));
        /* check if the problem is well scaled */
        if (min_aij >= 0.10 && max_aij <= 10.0)
        {  xprintf("Problem data seem to be well scaled");
            /* skip scaling, if required */
            if (flags & GLP_SF_SKIP) return;
        }
        /* perform iterative geometric mean scaling, if required */
        if (flags & GLP_SF_GM)
        {  gm_iterate(lp, 15, 0.90);
            min_aij = min_mat_aij(lp, 1);
            max_aij = max_mat_aij(lp, 1);
            ratio = max_aij / min_aij;
            xprintf(fmt("GM", min_aij, max_aij, ratio));
        }
        /* perform equilibration scaling, if required */
        if (flags & GLP_SF_EQ)
        {  eq_scaling(lp, max_row_ratio(lp) > max_col_ratio(lp));
            min_aij = min_mat_aij(lp, 1);
            max_aij = max_mat_aij(lp, 1);
            ratio = max_aij / min_aij;
            xprintf(fmt("EQ", min_aij, max_aij, ratio));
        }
        /* round scale factors to nearest power of two, if required */
        if (flags & GLP_SF_2N)
        {  var i, j;
            for (i = 1; i <= lp.m; i++)
                glp_set_rii(lp, i, round2n(glp_get_rii(lp, i)));
            for (j = 1; j <= lp.n; j++)
                glp_set_sjj(lp, j, round2n(glp_get_sjj(lp, j)));
            min_aij = min_mat_aij(lp, 1);
            max_aij = max_mat_aij(lp, 1);
            ratio = max_aij / min_aij;
            xprintf(fmt("2N", min_aij, max_aij, ratio));
        }
    }


    if (flags & ~(GLP_SF_GM | GLP_SF_EQ | GLP_SF_2N | GLP_SF_SKIP | GLP_SF_AUTO))
        xerror("glp_scale_prob: flags = " + flags + "; invalid scaling options");
    if (flags & GLP_SF_AUTO)
        flags = (GLP_SF_GM | GLP_SF_EQ | GLP_SF_SKIP);
    scale_prob(lp, flags);
};

function spx_primal(lp, parm){

    const kappa = 0.10;

    function alloc_csa(lp){
        var m = lp.m;
        var n = lp.n;
        var nnz = lp.nnz;
        var csa = {};
        xassert(m > 0 && n > 0);
        csa.m = m;
        csa.n = n;
        csa.type = new Array(1+m+n);
        csa.lb = new Array(1+m+n);
        csa.ub = new Array(1+m+n);
        csa.coef = new Array(1+m+n);
        csa.obj = new Array(1+n);
        csa.A_ptr = new Array(1+n+1);
        csa.A_ind = new Array(1+nnz);
        csa.A_val = new Array(1+nnz);
        csa.head = new Array(1+m+n);
        csa.stat = new Array(1+n);
        csa.N_ptr = new Array(1+m+1);
        csa.N_len = new Array(1+m);
        csa.N_ind = null; /* will be allocated later */
        csa.N_val = null; /* will be allocated later */
        csa.bbar = new Array(1+m);
        csa.cbar = new Array(1+n);
        csa.refsp = new Array(1+m+n);
        csa.gamma = new Array(1+n);
        csa.tcol_ind = new Array(1+m);
        csa.tcol_vec = new Array(1+m);
        csa.trow_ind = new Array(1+n);
        csa.trow_vec = new Array(1+n);
        csa.work1 = new Array(1+m);
        csa.work2 = new Array(1+m);
        csa.work3 = new Array(1+m);
        csa.work4 = new Array(1+m);
        return csa;
    }

    function init_csa(csa, lp){
        var m = csa.m;
        var n = csa.n;
        var type = csa.type;
        var lb = csa.lb;
        var ub = csa.ub;
        var coef = csa.coef;
        var obj = csa.obj;
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var stat = csa.stat;
        var refsp = csa.refsp;
        var gamma = csa.gamma;
        var i, j, k, loc;
        var cmax;
        var row, col;
        /* auxiliary variables */
        for (i = 1; i <= m; i++)
        {  row = lp.row[i];
            type[i] = row.type;
            lb[i] = row.lb * row.rii;
            ub[i] = row.ub * row.rii;
            coef[i] = 0.0;
        }
        /* structural variables */
        for (j = 1; j <= n; j++)
        {  col = lp.col[j];
            type[m+j] = col.type;
            lb[m+j] = col.lb / col.sjj;
            ub[m+j] = col.ub / col.sjj;
            coef[m+j] = col.coef * col.sjj;
        }
        /* original objective function */
        obj[0] = lp.c0;
        xcopyArr(obj, 1, coef, m+1, n);
        /* factor used to scale original objective coefficients */
        cmax = 0.0;
        for (j = 1; j <= n; j++)
            if (cmax < Math.abs(obj[j])) cmax = Math.abs(obj[j]);
        if (cmax == 0.0) cmax = 1.0;
        switch (lp.dir)
        {  case GLP_MIN:
            csa.zeta = + 1.0 / cmax;
            break;
            case GLP_MAX:
                csa.zeta = - 1.0 / cmax;
                break;
            default:
                xassert(lp != lp);
        }
        if (Math.abs(csa.zeta) < 1.0) csa.zeta *= 1000.0;
        /* matrix A (by columns) */
        loc = 1;
        for (j = 1; j <= n; j++)
        {   A_ptr[j] = loc;
            for (var aij = lp.col[j].ptr; aij != null; aij = aij.c_next)
            {  A_ind[loc] = aij.row.i;
                A_val[loc] = aij.row.rii * aij.val * aij.col.sjj;
                loc++;
            }
        }
        A_ptr[n+1] = loc;
        xassert(loc == lp.nnz+1);
        /* basis header */
        xassert(lp.valid);
        xcopyArr(head, 1, lp.head, 1, m);
        k = 0;
        for (i = 1; i <= m; i++)
        {  row = lp.row[i];
            if (row.stat != GLP_BS)
            {  k++;
                xassert(k <= n);
                head[m+k] = i;
                stat[k] = row.stat;
            }
        }
        for (j = 1; j <= n; j++)
        {  col = lp.col[j];
            if (col.stat != GLP_BS)
            {  k++;
                xassert(k <= n);
                head[m+k] = m + j;
                stat[k] = col.stat;
            }
        }
        xassert(k == n);
        /* factorization of matrix B */
        csa.valid = 1; lp.valid = 0;
        csa.bfd = lp.bfd; lp.bfd = null;
        /* matrix N (by rows) */
        alloc_N(csa);
        build_N(csa);
        /* working parameters */
        csa.phase = 0;
        csa.tm_beg = xtime();
        csa.it_beg = csa.it_cnt = lp.it_cnt;
        csa.it_dpy = -1;
        /* reference space and steepest edge coefficients */
        csa.refct = 0;
        xfillArr(refsp, 1, 0, m+n);
        for (j = 1; j <= n; j++) gamma[j] = 1.0;
    }

    function inv_col(csa, i, ind, val){
        /* this auxiliary routine returns row indices and numeric values
         of non-zero elements of i-th column of the basis matrix */
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var k, len, ptr, t;
        if(GLP_DEBUG){xassert(1 <= i && i <= m)}
        k = head[i]; /* B[i] is k-th column of (I|-A) */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        if (k <= m)
        {  /* B[i] is k-th column of submatrix I */
            len = 1;
            ind[1] = k;
            val[1] = 1.0;
        }
        else
        {  /* B[i] is (k-m)-th column of submatrix (-A) */
            ptr = A_ptr[k-m];
            len = A_ptr[k-m+1] - ptr;
            xcopyArr(ind, 1, A_ind, ptr, len);
            xcopyArr(val, 1, A_val, ptr, len);
            for (t = 1; t <= len; t++) val[t] = - val[t];
        }
        return len;
    }

    function invert_B(csa){
        var ret = bfd_factorize(csa.bfd, csa.m, null, inv_col, csa);
        csa.valid = (ret == 0);
        return ret;
    }

    function update_B(csa, i, k){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var val, ret;
        if (GLP_DEBUG){
            xassert(1 <= i && i <= m);
            xassert(1 <= k && k <= m+n);
        }
        if (k <= m)
        {  /* new i-th column of B is k-th column of I */
            var ind = new Array(1+1);
            val = new Array(1+1);
            ind[1] = k;
            val[1] = 1.0;
            xassert(csa.valid);
            ret = bfd_update_it(csa.bfd, i, 0, 1, ind, 0, val);
        }
        else
        {  /* new i-th column of B is (k-m)-th column of (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var A_val = csa.A_val;
            val = csa.work1;
            var beg, end, ptr, len;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            len = 0;
            for (ptr = beg; ptr < end; ptr++)
                val[++len] = - A_val[ptr];
            xassert(csa.valid);
            ret = bfd_update_it(csa.bfd, i, 0, len, A_ind, beg-1, val);
        }
        csa.valid = (ret == 0);
        return ret;
    }

    function error_ftran(csa, h, x, r){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var i, k, beg, end, ptr;
        var temp;
        /* compute the residual vector:
         r = h - B * x = h - B[1] * x[1] - ... - B[m] * x[m],
         where B[1], ..., B[m] are columns of matrix B */
        xcopyArr(r, 1, h, 1, m);
        for (i = 1; i <= m; i++)
        {  temp = x[i];
            if (temp == 0.0) continue;
            k = head[i]; /* B[i] is k-th column of (I|-A) */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (k <= m)
            {  /* B[i] is k-th column of submatrix I */
                r[k] -= temp;
            }
            else
            {  /* B[i] is (k-m)-th column of submatrix (-A) */
                beg = A_ptr[k-m];
                end = A_ptr[k-m+1];
                for (ptr = beg; ptr < end; ptr++)
                    r[A_ind[ptr]] += A_val[ptr] * temp;
            }
        }
    }

    function refine_ftran(csa, h, x){
        var m = csa.m;
        var r = csa.work1;
        var d = csa.work1;
        var i;
        /* compute the residual vector r = h - B * x */
        error_ftran(csa, h, x, r);
        /* compute the correction vector d = inv(B) * r */
        xassert(csa.valid);
        bfd_ftran(csa.bfd, d);
        /* refine the solution vector (new x) = (old x) + d */
        for (i = 1; i <= m; i++) x[i] += d[i];
    }

    function error_btran(csa, h, x, r){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var i, k, beg, end, ptr;
        var temp;
        /* compute the residual vector r = b - B'* x */
        for (i = 1; i <= m; i++)
        {  /* r[i] := b[i] - (i-th column of B)'* x */
            k = head[i]; /* B[i] is k-th column of (I|-A) */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            temp = h[i];
            if (k <= m)
            {  /* B[i] is k-th column of submatrix I */
                temp -= x[k];
            }
            else
            {  /* B[i] is (k-m)-th column of submatrix (-A) */
                beg = A_ptr[k-m];
                end = A_ptr[k-m+1];
                for (ptr = beg; ptr < end; ptr++)
                    temp += A_val[ptr] * x[A_ind[ptr]];
            }
            r[i] = temp;
        }
    }

    function refine_btran(csa, h, x){
        var m = csa.m;
        var r = csa.work1;
        var d = csa.work1;
        var i;
        /* compute the residual vector r = h - B'* x */
        error_btran(csa, h, x, r);
        /* compute the correction vector d = inv(B') * r */
        xassert(csa.valid);
        bfd_btran(csa.bfd, d);
        /* refine the solution vector (new x) = (old x) + d */
        for (i = 1; i <= m; i++) x[i] += d[i];
    }

    function alloc_N(csa){
        var m = csa.m;
        var n = csa.n;
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var N_ptr = csa.N_ptr;
        var N_len = csa.N_len;
        var i, j, beg, end, ptr;
        /* determine number of non-zeros in each row of the augmented
         constraint matrix (I|-A) */
        for (i = 1; i <= m; i++)
            N_len[i] = 1;
        for (j = 1; j <= n; j++)
        {  beg = A_ptr[j];
            end = A_ptr[j+1];
            for (ptr = beg; ptr < end; ptr++)
                N_len[A_ind[ptr]]++;
        }
        /* determine maximal row lengths of matrix N and set its row
         pointers */
        N_ptr[1] = 1;
        for (i = 1; i <= m; i++)
        {  /* row of matrix N cannot have more than n non-zeros */
            if (N_len[i] > n) N_len[i] = n;
            N_ptr[i+1] = N_ptr[i] + N_len[i];
        }
        /* now maximal number of non-zeros in matrix N is known */
        csa.N_ind = new Array(N_ptr[m+1]);
        csa.N_val = new Array(N_ptr[m+1]);
    }

    function add_N_col(csa, j, k){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var N_ptr = csa.N_ptr;
        var N_len = csa.N_len;
        var N_ind = csa.N_ind;
        var N_val = csa.N_val;
        var pos;
        if (GLP_DEBUG){
            xassert(1 <= j && j <= n);
            xassert(1 <= k && k <= m+n);
        }
        if (k <= m)
        {  /* N[j] is k-th column of submatrix I */
            pos = N_ptr[k] + (N_len[k]++);
            if (GLP_DEBUG){xassert(pos < N_ptr[k+1])}
            N_ind[pos] = j;
            N_val[pos] = 1.0;
        }
        else
        {  /* N[j] is (k-m)-th column of submatrix (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var A_val = csa.A_val;
            var i, beg, end, ptr;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            for (ptr = beg; ptr < end; ptr++)
            {  i = A_ind[ptr]; /* row number */
                pos = N_ptr[i] + (N_len[i]++);
                if (GLP_DEBUG){xassert(pos < N_ptr[i+1])}
                N_ind[pos] = j;
                N_val[pos] = - A_val[ptr];
            }
        }
    }

    function del_N_col(csa, j, k){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var N_ptr = csa.N_ptr;
        var N_len = csa.N_len;
        var N_ind = csa.N_ind;
        var N_val = csa.N_val;
        var pos, head, tail;
        if (GLP_DEBUG){
            xassert(1 <= j && j <= n);
            xassert(1 <= k && k <= m+n);
        }
        if (k <= m)
        {  /* N[j] is k-th column of submatrix I */
            /* find element in k-th row of N */
            head = N_ptr[k];
            for (pos = head; N_ind[pos] != j; pos++){} /* nop */
            /* and remove it from the row list */
            tail = head + (--N_len[k]);
            if (GLP_DEBUG){xassert(pos <= tail)}
            N_ind[pos] = N_ind[tail];
            N_val[pos] = N_val[tail];
        }
        else
        {  /* N[j] is (k-m)-th column of submatrix (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var i, beg, end, ptr;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            for (ptr = beg; ptr < end; ptr++)
            {  i = A_ind[ptr]; /* row number */
                /* find element in i-th row of N */
                head = N_ptr[i];
                for (pos = head; N_ind[pos] != j; pos++){} /* nop */
                /* and remove it from the row list */
                tail = head + (--N_len[i]);
                if (GLP_DEBUG){xassert(pos <= tail)}
                N_ind[pos] = N_ind[tail];
                N_val[pos] = N_val[tail];
            }
        }
    }

    function build_N(csa){
        var m = csa.m;
        var n = csa.n;
        var head = csa.head;
        var stat = csa.stat;
        var N_len = csa.N_len;
        var j, k;
        /* N := empty matrix */
        xfillArr(N_len, 1, 0, m);
        /* go through non-basic columns of matrix (I|-A) */
        for (j = 1; j <= n; j++)
        {  if (stat[j] != GLP_NS)
        {  /* xN[j] is non-fixed; add j-th column to matrix N which is
         k-th column of matrix (I|-A) */
            k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            add_N_col(csa, j, k);
        }
        }
    }

    function get_xN(csa, j){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var lb = csa.lb;
        var ub = csa.ub;
        var head = csa.head;
        var stat = csa.stat;
        var k;
        var xN;
        if (GLP_DEBUG){xassert(1 <= j && j <= n)}
        k = head[m+j]; /* x[k] = xN[j] */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        switch (stat[j])
        {  case GLP_NL:
            /* x[k] is on its lower bound */
            xN = lb[k]; break;
            case GLP_NU:
                /* x[k] is on its upper bound */
                xN = ub[k]; break;
            case GLP_NF:
                /* x[k] is free non-basic variable */
                xN = 0.0; break;
            case GLP_NS:
                /* x[k] is fixed non-basic variable */
                xN = lb[k]; break;
            default:
                xassert(stat != stat);
        }
        return xN;
    }

    function eval_beta(csa, beta){
        var m = csa.m;
        var n = csa.n;
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var h = csa.work2;
        var i, j, k, beg, end, ptr;
        var xN;
        /* compute the right-hand side vector:
         h := - N * xN = - N[1] * xN[1] - ... - N[n] * xN[n],
         where N[1], ..., N[n] are columns of matrix N */
        for (i = 1; i <= m; i++)
            h[i] = 0.0;
        for (j = 1; j <= n; j++)
        {  k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            /* determine current value of xN[j] */
            xN = get_xN(csa, j);
            if (xN == 0.0) continue;
            if (k <= m)
            {  /* N[j] is k-th column of submatrix I */
                h[k] -= xN;
            }
            else
            {  /* N[j] is (k-m)-th column of submatrix (-A) */
                beg = A_ptr[k-m];
                end = A_ptr[k-m+1];
                for (ptr = beg; ptr < end; ptr++)
                    h[A_ind[ptr]] += xN * A_val[ptr];
            }
        }
        /* solve system B * beta = h */
        xcopyArr(beta, 1, h, 1, m);
        xassert(csa.valid);
        bfd_ftran(csa.bfd, beta);
        /* and refine the solution */
        refine_ftran(csa, h, beta);
    }

    function eval_pi(csa, pi){
        var m = csa.m;
        var c = csa.coef;
        var head = csa.head;
        var cB = csa.work2;
        var i;
        /* construct the right-hand side vector cB */
        for (i = 1; i <= m; i++)
            cB[i] = c[head[i]];
        /* solve system B'* pi = cB */
        xcopyArr(pi, 1, cB, 1, m);
        xassert(csa.valid);
        bfd_btran(csa.bfd, pi);
        /* and refine the solution */
        refine_btran(csa, cB, pi);
    }

    function eval_cost(csa, pi, j){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var coef = csa.coef;
        var head = csa.head;
        var k;
        var dj;
        if (GLP_DEBUG){xassert(1 <= j && j <= n)}
        k = head[m+j]; /* x[k] = xN[j] */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        dj = coef[k];
        if (k <= m)
        {  /* N[j] is k-th column of submatrix I */
            dj -= pi[k];
        }
        else
        {  /* N[j] is (k-m)-th column of submatrix (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var A_val = csa.A_val;
            var beg, end, ptr;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            for (ptr = beg; ptr < end; ptr++)
                dj += A_val[ptr] * pi[A_ind[ptr]];
        }
        return dj;
    }

    function eval_bbar(csa)
    {
        eval_beta(csa, csa.bbar);
    }

    function eval_cbar(csa){
        if (GLP_DEBUG){var m = csa.m}
        var n = csa.n;
        if (GLP_DEBUG){var head = csa.head}
        var cbar = csa.cbar;
        var pi = csa.work3;
        var j;
        if(GLP_DEBUG){var k}
        /* compute simplex multipliers */
        eval_pi(csa, pi);
        /* compute and store reduced costs */
        for (j = 1; j <= n; j++)
        {
            if (GLP_DEBUG){
                k = head[m+j]; /* x[k] = xN[j] */
                xassert(1 <= k && k <= m+n);
            }
            cbar[j] = eval_cost(csa, pi, j);
        }
    }

    function reset_refsp(csa){
        var m = csa.m;
        var n = csa.n;
        var head = csa.head;
        var refsp = csa.refsp;
        var gamma = csa.gamma;
        var j, k;
        xassert(csa.refct == 0);
        csa.refct = 1000;
        xfillArr(refsp, 1, 0, m+n);
        for (j = 1; j <= n; j++)
        {  k = head[m+j]; /* x[k] = xN[j] */
            refsp[k] = 1;
            gamma[j] = 1.0;
        }
    }

    function eval_gamma(csa, j){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var head = csa.head;
        var refsp = csa.refsp;
        var alfa = csa.work3;
        var h = csa.work3;
        var i, k;
        var gamma;
        if (GLP_DEBUG){xassert(1 <= j && j <= n)}
        k = head[m+j]; /* x[k] = xN[j] */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        /* construct the right-hand side vector h = - N[j] */
        for (i = 1; i <= m; i++)
            h[i] = 0.0;
        if (k <= m)
        {  /* N[j] is k-th column of submatrix I */
            h[k] = -1.0;
        }
        else
        {  /* N[j] is (k-m)-th column of submatrix (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var A_val = csa.A_val;
            var beg, end, ptr;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            for (ptr = beg; ptr < end; ptr++)
                h[A_ind[ptr]] = A_val[ptr];
        }
        /* solve system B * alfa = h */
        xassert(csa.valid);
        bfd_ftran(csa.bfd, alfa);
        /* compute gamma */
        gamma = (refsp[k] ? 1.0 : 0.0);
        for (i = 1; i <= m; i++)
        {  k = head[i];
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (refsp[k]) gamma += alfa[i] * alfa[i];
        }
        return gamma;
    }

    function chuzc(csa, tol_dj){
        var n = csa.n;
        var stat = csa.stat;
        var cbar = csa.cbar;
        var gamma = csa.gamma;
        var j, q;
        var dj, best, temp;
        /* nothing is chosen so far */
        q = 0; best = 0.0;
        /* look through the list of non-basic variables */
        for (j = 1; j <= n; j++)
        {  dj = cbar[j];
            switch (stat[j])
            {  case GLP_NL:
                /* xN[j] can increase */
                if (dj >= - tol_dj) continue;
                break;
                case GLP_NU:
                    /* xN[j] can decrease */
                    if (dj <= + tol_dj) continue;
                    break;
                case GLP_NF:
                    /* xN[j] can change in any direction */
                    if (- tol_dj <= dj && dj <= + tol_dj) continue;
                    break;
                case GLP_NS:
                    /* xN[j] cannot change at all */
                    continue;
                default:
                    xassert(stat != stat);
            }
            /* xN[j] is eligible non-basic variable; choose one which has
             largest weighted reduced cost */
            if (GLP_DEBUG){xassert(gamma[j] > 0.0)}
            temp = (dj * dj) / gamma[j];
            if (best < temp){
                q = j;
                best = temp;
            }
        }
        /* store the index of non-basic variable xN[q] chosen */
        csa.q = q;
    }

    function eval_tcol(csa){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var head = csa.head;
        var q = csa.q;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var h = csa.tcol_vec;
        var i, k, nnz;
        if (GLP_DEBUG){xassert(1 <= q && q <= n)}
        k = head[m+q]; /* x[k] = xN[q] */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        /* construct the right-hand side vector h = - N[q] */
        for (i = 1; i <= m; i++)
            h[i] = 0.0;
        if (k <= m)
        {  /* N[q] is k-th column of submatrix I */
            h[k] = -1.0;
        }
        else
        {  /* N[q] is (k-m)-th column of submatrix (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var A_val = csa.A_val;
            var beg, end, ptr;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            for (ptr = beg; ptr < end; ptr++)
                h[A_ind[ptr]] = A_val[ptr];
        }
        /* solve system B * tcol = h */
        xassert(csa.valid);
        bfd_ftran(csa.bfd, tcol_vec);
        /* construct sparse pattern of the pivot column */
        nnz = 0;
        for (i = 1; i <= m; i++)
        {  if (tcol_vec[i] != 0.0)
            tcol_ind[++nnz] = i;
        }
        csa.tcol_nnz = nnz;
    }

    function refine_tcol(csa){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var head = csa.head;
        var q = csa.q;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var h = csa.work3;
        var i, k, nnz;
        if (GLP_DEBUG){xassert(1 <= q && q <= n)}
        k = head[m+q]; /* x[k] = xN[q] */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        /* construct the right-hand side vector h = - N[q] */
        for (i = 1; i <= m; i++)
            h[i] = 0.0;
        if (k <= m)
        {  /* N[q] is k-th column of submatrix I */
            h[k] = -1.0;
        }
        else
        {  /* N[q] is (k-m)-th column of submatrix (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var A_val = csa.A_val;
            var beg, end, ptr;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            for (ptr = beg; ptr < end; ptr++)
                h[A_ind[ptr]] = A_val[ptr];
        }
        /* refine solution of B * tcol = h */
        refine_ftran(csa, h, tcol_vec);
        /* construct sparse pattern of the pivot column */
        nnz = 0;
        for (i = 1; i <= m; i++)
        {  if (tcol_vec[i] != 0.0)
            tcol_ind[++nnz] = i;
        }
        csa.tcol_nnz = nnz;
    }

    function sort_tcol(csa, tol_piv){
        if (GLP_DEBUG){var m = csa.m}
        var nnz = csa.tcol_nnz;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var i, num, pos;
        var big, eps, temp;
        /* compute infinity (maximum) norm of the column */
        big = 0.0;
        for (pos = 1; pos <= nnz; pos++)
        {
            if (GLP_DEBUG){
                i = tcol_ind[pos];
                xassert(1 <= i && i <= m);
            }
            temp = Math.abs(tcol_vec[tcol_ind[pos]]);
            if (big < temp) big = temp;
        }
        csa.tcol_max = big;
        /* determine absolute pivot tolerance */
        eps = tol_piv * (1.0 + 0.01 * big);
        /* move significant column components to front of the list */
        for (num = 0; num < nnz; )
        {  i = tcol_ind[nnz];
            if (Math.abs(tcol_vec[i]) < eps)
                nnz--;
            else
            {  num++;
                tcol_ind[nnz] = tcol_ind[num];
                tcol_ind[num] = i;
            }
        }
        csa.tcol_num = num;
    }

    function chuzr(csa, rtol){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var type = csa.type;
        var lb = csa.lb;
        var ub = csa.ub;
        var coef = csa.coef;
        var head = csa.head;
        var phase = csa.phase;
        var bbar = csa.bbar;
        var cbar = csa.cbar;
        var q = csa.q;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var tcol_num = csa.tcol_num;
        var i, i_stat, k, p, p_stat, pos;
        var alfa, big, delta, s, t, teta, tmax;
        if (GLP_DEBUG){xassert(1 <= q && q <= n)}
        /* s := - sign(d[q]), where d[q] is reduced cost of xN[q] */
        if (GLP_DEBUG){xassert(cbar[q] != 0.0)}
        s = (cbar[q] > 0.0 ? -1.0 : +1.0);
        /*** FIRST PASS ***/
        k = head[m+q]; /* x[k] = xN[q] */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        if (type[k] == GLP_DB)
        {  /* xN[q] has both lower and upper bounds */
            p = -1; p_stat = 0; teta = ub[k] - lb[k]; big = 1.0;
        }
        else
        {  /* xN[q] has no opposite bound */
            p = 0; p_stat = 0; teta = DBL_MAX; big = 0.0;
        }
        /* walk through significant elements of the pivot column */
        for (pos = 1; pos <= tcol_num; pos++)
        {  i = tcol_ind[pos];
            if (GLP_DEBUG){xassert(1 <= i && i <= m)}
            k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            alfa = s * tcol_vec[i];
            if (GLP_DEBUG){xassert(alfa != 0.0)}
            /* xB[i] = ... + alfa * xN[q] + ..., and due to s we need to
             consider the only case when xN[q] is increasing */
            if (alfa > 0.0)
            {  /* xB[i] is increasing */
                if (phase == 1 && coef[k] < 0.0)
                {  /* xB[i] violates its lower bound, which plays the role
                 of an upper bound on phase I */
                    delta = rtol * (1.0 + kappa * Math.abs(lb[k]));
                    t = ((lb[k] + delta) - bbar[i]) / alfa;
                    i_stat = GLP_NL;
                }
                else if (phase == 1 && coef[k] > 0.0)
                {  /* xB[i] violates its upper bound, which plays the role
                 of an lower bound on phase I */
                    continue;
                }
                else if (type[k] == GLP_UP || type[k] == GLP_DB ||
                    type[k] == GLP_FX)
                {  /* xB[i] is within its bounds and has an upper bound */
                    delta = rtol * (1.0 + kappa * Math.abs(ub[k]));
                    t = ((ub[k] + delta) - bbar[i]) / alfa;
                    i_stat = GLP_NU;
                }
                else
                {  /* xB[i] is within its bounds and has no upper bound */
                    continue;
                }
            }
            else
            {  /* xB[i] is decreasing */
                if (phase == 1 && coef[k] > 0.0)
                {  /* xB[i] violates its upper bound, which plays the role
                 of an lower bound on phase I */
                    delta = rtol * (1.0 + kappa * Math.abs(ub[k]));
                    t = ((ub[k] - delta) - bbar[i]) / alfa;
                    i_stat = GLP_NU;
                }
                else if (phase == 1 && coef[k] < 0.0)
                {  /* xB[i] violates its lower bound, which plays the role
                 of an upper bound on phase I */
                    continue;
                }
                else if (type[k] == GLP_LO || type[k] == GLP_DB ||
                    type[k] == GLP_FX)
                {  /* xB[i] is within its bounds and has an lower bound */
                    delta = rtol * (1.0 + kappa * Math.abs(lb[k]));
                    t = ((lb[k] - delta) - bbar[i]) / alfa;
                    i_stat = GLP_NL;
                }
                else
                {  /* xB[i] is within its bounds and has no lower bound */
                    continue;
                }
            }
            /* t is a change of xN[q], on which xB[i] reaches its bound
             (possibly relaxed); since the basic solution is assumed to
             be primal feasible (or pseudo feasible on phase I), t has
             to be non-negative by definition; however, it may happen
             that xB[i] slightly (i.e. within a tolerance) violates its
             bound, that leads to negative t; in the latter case, if
             xB[i] is chosen, negative t means that xN[q] changes in
             wrong direction; if pivot alfa[i,q] is close to zero, even
             small bound violation of xB[i] may lead to a large change
             of xN[q] in wrong direction; let, for example, xB[i] >= 0
             and in the current basis its value be -5e-9; let also xN[q]
             be on its zero bound and should increase; from the ratio
             test rule it follows that the pivot alfa[i,q] < 0; however,
             if alfa[i,q] is, say, -1e-9, the change of xN[q] in wrong
             direction is 5e-9 / (-1e-9) = -5, and using it for updating
             values of other basic variables will give absolutely wrong
             results; therefore, if t is negative, we should replace it
             by exact zero assuming that xB[i] is exactly on its bound,
             and the violation appears due to round-off errors */
            if (t < 0.0) t = 0.0;
            /* apply minimal ratio test */
            if (teta > t || teta == t && big < Math.abs(alfa)){
                p = i; p_stat = i_stat; teta = t; big = Math.abs(alfa);
            }

        }
        /* the second pass is skipped in the following cases: */
        /* if the standard ratio test is used */
        if (rtol == 0.0) return done();
        /* if xN[q] reaches its opposite bound or if no basic variable
         has been chosen on the first pass */
        if (p <= 0) return done();
        /* if xB[p] is a blocking variable, i.e. if it prevents xN[q]
         from any change */
        if (teta == 0.0) return done();
        /*** SECOND PASS ***/
        /* here tmax is a maximal change of xN[q], on which the solution
         remains primal feasible (or pseudo feasible on phase I) within
         a tolerance */
        tmax = teta;
        /* nothing is chosen so far */
        p = 0; p_stat = 0; teta = DBL_MAX; big = 0.0;
        /* walk through significant elements of the pivot column */
        for (pos = 1; pos <= tcol_num; pos++)
        {  i = tcol_ind[pos];
            if (GLP_DEBUG){xassert(1 <= i && i <= m)}
            k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            alfa = s * tcol_vec[i];
            if (GLP_DEBUG){xassert(alfa != 0.0)}
            /* xB[i] = ... + alfa * xN[q] + ..., and due to s we need to
             consider the only case when xN[q] is increasing */
            if (alfa > 0.0)
            {  /* xB[i] is increasing */
                if (phase == 1 && coef[k] < 0.0)
                {  /* xB[i] violates its lower bound, which plays the role
                 of an upper bound on phase I */
                    t = (lb[k] - bbar[i]) / alfa;
                    i_stat = GLP_NL;
                }
                else if (phase == 1 && coef[k] > 0.0)
                {  /* xB[i] violates its upper bound, which plays the role
                 of an lower bound on phase I */
                    continue;
                }
                else if (type[k] == GLP_UP || type[k] == GLP_DB ||
                    type[k] == GLP_FX)
                {  /* xB[i] is within its bounds and has an upper bound */
                    t = (ub[k] - bbar[i]) / alfa;
                    i_stat = GLP_NU;
                }
                else
                {  /* xB[i] is within its bounds and has no upper bound */
                    continue;
                }
            }
            else
            {  /* xB[i] is decreasing */
                if (phase == 1 && coef[k] > 0.0)
                {  /* xB[i] violates its upper bound, which plays the role
                 of an lower bound on phase I */
                    t = (ub[k] - bbar[i]) / alfa;
                    i_stat = GLP_NU;
                }
                else if (phase == 1 && coef[k] < 0.0)
                {  /* xB[i] violates its lower bound, which plays the role
                 of an upper bound on phase I */
                    continue;
                }
                else if (type[k] == GLP_LO || type[k] == GLP_DB ||
                    type[k] == GLP_FX)
                {  /* xB[i] is within its bounds and has an lower bound */
                    t = (lb[k] - bbar[i]) / alfa;
                    i_stat = GLP_NL;
                }
                else
                {  /* xB[i] is within its bounds and has no lower bound */
                    continue;
                }
            }
            /* (see comments for the first pass) */
            if (t < 0.0) t = 0.0;
            /* t is a change of xN[q], on which xB[i] reaches its bound;
             if t <= tmax, all basic variables can violate their bounds
             only within relaxation tolerance delta; we can use this
             freedom and choose basic variable having largest influence
             coefficient to avoid possible numeric instability */
            if (t <= tmax && big < Math.abs(alfa)){
                p = i; p_stat = i_stat; teta = t; big = Math.abs(alfa);
            }
        }
        /* something must be chosen on the second pass */
        xassert(p != 0);

        function done(){
            /* store the index and status of basic variable xB[p] chosen */
            csa.p = p;
            if (p > 0 && type[head[p]] == GLP_FX)
                csa.p_stat = GLP_NS;
            else
                csa.p_stat = p_stat;
            /* store corresponding change of non-basic variable xN[q] */
            if (GLP_DEBUG){xassert(teta >= 0.0)}
            csa.teta = s * teta;
        }
        done();
    }

    function eval_rho(csa, rho){
        var m = csa.m;
        var p = csa.p;
        var i;
        if (GLP_DEBUG){xassert(1 <= p && p <= m)}
        /* construct the right-hand side vector rho[p] */
        for (i = 1; i <= m; i++)
            rho[i] = 0.0;
        rho[p] = 1.0;
        /* solve system B'* rho = rho[p] */
        xassert(csa.valid);
        bfd_btran(csa.bfd, rho);
    }

    function refine_rho(csa, rho){
        var m = csa.m;
        var p = csa.p;
        var e = csa.work3;
        var i;
        if (GLP_DEBUG){xassert(1 <= p && p <= m)}
        /* construct the right-hand side vector e[p] */
        for (i = 1; i <= m; i++)
            e[i] = 0.0;
        e[p] = 1.0;
        /* refine solution of B'* rho = e[p] */
        refine_btran(csa, e, rho);
    }

    function eval_trow(csa, rho){
        var m = csa.m;
        var n = csa.n;
        if (GLP_DEBUG){var stat = csa.stat}
        var N_ptr = csa.N_ptr;
        var N_len = csa.N_len;
        var N_ind = csa.N_ind;
        var N_val = csa.N_val;
        var trow_ind = csa.trow_ind;
        var trow_vec = csa.trow_vec;
        var i, j, beg, end, ptr, nnz;
        var temp;
        /* clear the pivot row */
        for (j = 1; j <= n; j++)
            trow_vec[j] = 0.0;
        /* compute the pivot row as a linear combination of rows of the
         matrix N: trow = - rho[1] * N'[1] - ... - rho[m] * N'[m] */
        for (i = 1; i <= m; i++)
        {  temp = rho[i];
            if (temp == 0.0) continue;
            /* trow := trow - rho[i] * N'[i] */
            beg = N_ptr[i];
            end = beg + N_len[i];
            for (ptr = beg; ptr < end; ptr++)
            {
                if (GLP_DEBUG){
                    j = N_ind[ptr];
                    xassert(1 <= j && j <= n);
                    xassert(stat[j] != GLP_NS);
                }
                trow_vec[N_ind[ptr]] -= temp * N_val[ptr];
            }
        }
        /* construct sparse pattern of the pivot row */
        nnz = 0;
        for (j = 1; j <= n; j++)
        {  if (trow_vec[j] != 0.0)
            trow_ind[++nnz] = j;
        }
        csa.trow_nnz = nnz;
    }

    function update_bbar(csa){
        if (GLP_DEBUG){
            var m = csa.m;
            var n = csa.n;
        }
        var bbar = csa.bbar;
        var q = csa.q;
        var tcol_nnz = csa.tcol_nnz;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var p = csa.p;
        var teta = csa.teta;
        var i, pos;
        if (GLP_DEBUG){
            xassert(1 <= q && q <= n);
            xassert(p < 0 || 1 <= p && p <= m);
        }
        /* if xN[q] leaves the basis, compute its value in the adjacent
         basis, where it will replace xB[p] */
        if (p > 0)
            bbar[p] = get_xN(csa, q) + teta;
        /* update values of other basic variables (except xB[p], because
         it will be replaced by xN[q]) */
        if (teta == 0.0) return;
        for (pos = 1; pos <= tcol_nnz; pos++)
        {  i = tcol_ind[pos];
            /* skip xB[p] */
            if (i == p) continue;
            /* (change of xB[i]) = alfa[i,q] * (change of xN[q]) */
            bbar[i] += tcol_vec[i] * teta;
        }
    }

    function reeval_cost(csa){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var coef = csa.coef;
        var head = csa.head;
        var q = csa.q;
        var tcol_nnz = csa.tcol_nnz;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var i, pos;
        var dq;
        if (GLP_DEBUG){xassert(1 <= q && q <= n)}
        dq = coef[head[m+q]];
        for (pos = 1; pos <= tcol_nnz; pos++)
        {  i = tcol_ind[pos];
            if (GLP_DEBUG){xassert(1 <= i && i <= m)}
            dq += coef[head[i]] * tcol_vec[i];
        }
        return dq;
    }

    function update_cbar(csa){
        if (GLP_DEBUG){var n = csa.n}
        var cbar = csa.cbar;
        var q = csa.q;
        var trow_nnz = csa.trow_nnz;
        var trow_ind = csa.trow_ind;
        var trow_vec = csa.trow_vec;
        var j, pos;
        var new_dq;
        if (GLP_DEBUG){xassert(1 <= q && q <= n)}
        /* compute reduced cost of xB[p] in the adjacent basis, where it
         will replace xN[q] */
        if (GLP_DEBUG){xassert(trow_vec[q] != 0.0)}
        new_dq = (cbar[q] /= trow_vec[q]);
        /* update reduced costs of other non-basic variables (except
         xN[q], because it will be replaced by xB[p]) */
        for (pos = 1; pos <= trow_nnz; pos++)
        {  j = trow_ind[pos];
            /* skip xN[q] */
            if (j == q) continue;
            cbar[j] -= trow_vec[j] * new_dq;
        }
    }

    function update_gamma(csa){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var type = csa.type;
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var refsp = csa.refsp;
        var gamma = csa.gamma;
        var q = csa.q;
        var tcol_nnz = csa.tcol_nnz;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var p = csa.p;
        var trow_nnz = csa.trow_nnz;
        var trow_ind = csa.trow_ind;
        var trow_vec = csa.trow_vec;
        var u = csa.work3;
        var i, j, k, pos, beg, end, ptr;
        var gamma_q, delta_q, pivot, s, t, t1, t2;
        if (GLP_DEBUG){
            xassert(1 <= p && p <= m);
            xassert(1 <= q && q <= n);
        }
        /* the basis changes, so decrease the count */
        xassert(csa.refct > 0);
        csa.refct--;
        /* recompute gamma[q] for the current basis more accurately and
         compute auxiliary vector u */
        gamma_q = delta_q = (refsp[head[m+q]] ? 1.0 : 0.0);
        for (i = 1; i <= m; i++) u[i] = 0.0;
        for (pos = 1; pos <= tcol_nnz; pos++)
        {  i = tcol_ind[pos];
            if (refsp[head[i]])
            {  u[i] = t = tcol_vec[i];
                gamma_q += t * t;
            }
            else
                u[i] = 0.0;
        }
        xassert(csa.valid);
        bfd_btran(csa.bfd, u);
        /* update gamma[k] for other non-basic variables (except fixed
         variables and xN[q], because it will be replaced by xB[p]) */
        pivot = trow_vec[q];
        if (GLP_DEBUG){xassert(pivot != 0.0)}
        for (pos = 1; pos <= trow_nnz; pos++)
        {  j = trow_ind[pos];
            /* skip xN[q] */
            if (j == q) continue;
            /* compute t */
            t = trow_vec[j] / pivot;
            /* compute inner product s = N'[j] * u */
            k = head[m+j]; /* x[k] = xN[j] */
            if (k <= m)
                s = u[k];
            else
            {  s = 0.0;
                beg = A_ptr[k-m];
                end = A_ptr[k-m+1];
                for (ptr = beg; ptr < end; ptr++)
                    s -= A_val[ptr] * u[A_ind[ptr]];
            }
            /* compute gamma[k] for the adjacent basis */
            t1 = gamma[j] + t * t * gamma_q + 2.0 * t * s;
            t2 = (refsp[k] ? 1.0 : 0.0) + delta_q * t * t;
            gamma[j] = (t1 >= t2 ? t1 : t2);
            if (gamma[j] < DBL_EPSILON) gamma[j] = DBL_EPSILON;
        }
        /* compute gamma[q] for the adjacent basis */
        if (type[head[p]] == GLP_FX)
            gamma[q] = 1.0;
        else
        {  gamma[q] = gamma_q / (pivot * pivot);
            if (gamma[q] < DBL_EPSILON) gamma[q] = DBL_EPSILON;
        }
    }

    function err_in_bbar(csa){
        var m = csa.m;
        var bbar = csa.bbar;
        var i;
        var e, emax, beta;
        beta = new Array(1+m);
        eval_beta(csa, beta);
        emax = 0.0;
        for (i = 1; i <= m; i++)
        {  e = Math.abs(beta[i] - bbar[i]) / (1.0 + Math.abs(beta[i]));
            if (emax < e) emax = e;
        }
        return emax;
    }

    function err_in_cbar(csa){
        var m = csa.m;
        var n = csa.n;
        var stat = csa.stat;
        var cbar = csa.cbar;
        var j;
        var e, emax, cost, pi;
        pi = new Array(1+m);
        eval_pi(csa, pi);
        emax = 0.0;
        for (j = 1; j <= n; j++)
        {  if (stat[j] == GLP_NS) continue;
            cost = eval_cost(csa, pi, j);
            e = Math.abs(cost - cbar[j]) / (1.0 + Math.abs(cost));
            if (emax < e) emax = e;
        }
        return emax;
    }

    function err_in_gamma(csa){
        var n = csa.n;
        var stat = csa.stat;
        var gamma = csa.gamma;
        var j;
        var e, emax, temp;
        emax = 0.0;
        for (j = 1; j <= n; j++)
        {  if (stat[j] == GLP_NS)
        {  xassert(gamma[j] == 1.0);
            continue;
        }
            temp = eval_gamma(csa, j);
            e = Math.abs(temp - gamma[j]) / (1.0 + Math.abs(temp));
            if (emax < e) emax = e;
        }
        return emax;
    }

    function change_basis(csa){
        var m = csa.m;
        if (GLP_DEBUG){
            var n = csa.n;
            var type = csa.type;
        }
        var head = csa.head;
        var stat = csa.stat;
        var q = csa.q;
        var p = csa.p;
        var p_stat = csa.p_stat;
        var k;
        if (GLP_DEBUG){xassert(1 <= q && q <= n)}
        if (p < 0)
        {  /* xN[q] goes to its opposite bound */
            if (GLP_DEBUG){
                k = head[m+q]; /* x[k] = xN[q] */
                xassert(1 <= k && k <= m+n);
                xassert(type[k] == GLP_DB);
            }
            switch (stat[q])
            {  case GLP_NL:
                /* xN[q] increases */
                stat[q] = GLP_NU;
                break;
                case GLP_NU:
                    /* xN[q] decreases */
                    stat[q] = GLP_NL;
                    break;
                default:
                    xassert(stat != stat);
            }
        }
        else
        {  /* xB[p] leaves the basis, xN[q] enters the basis */
            if (GLP_DEBUG){
                xassert(1 <= p && p <= m);
                k = head[p]; /* x[k] = xB[p] */
                switch (p_stat)
                {  case GLP_NL:
                    /* xB[p] goes to its lower bound */
                    xassert(type[k] == GLP_LO || type[k] == GLP_DB);
                    break;
                    case GLP_NU:
                        /* xB[p] goes to its upper bound */
                        xassert(type[k] == GLP_UP || type[k] == GLP_DB);
                        break;
                    case GLP_NS:
                        /* xB[p] goes to its fixed value */
                        xassert(type[k] == GLP_NS);
                        break;
                    default:
                        xassert(p_stat != p_stat);
                }
            }
            /* xB[p] <. xN[q] */
            k = head[p];
            head[p] = head[m+q];
            head[m+q] = k;
            stat[q] = p_stat;
        }
    }

    function set_aux_obj(csa, tol_bnd){
        var m = csa.m;
        var n = csa.n;
        var type = csa.type;
        var lb = csa.lb;
        var ub = csa.ub;
        var coef = csa.coef;
        var head = csa.head;
        var bbar = csa.bbar;
        var i, k, cnt = 0;
        var eps;
        /* use a bit more restrictive tolerance */
        tol_bnd *= 0.90;
        /* clear all objective coefficients */
        for (k = 1; k <= m+n; k++)
            coef[k] = 0.0;
        /* walk through the list of basic variables */
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            if (type[k] == GLP_LO || type[k] == GLP_DB ||
                type[k] == GLP_FX)
            {  /* x[k] has lower bound */
                eps = tol_bnd * (1.0 + kappa * Math.abs(lb[k]));
                if (bbar[i] < lb[k] - eps)
                {  /* and violates it */
                    coef[k] = -1.0;
                    cnt++;
                }
            }
            if (type[k] == GLP_UP || type[k] == GLP_DB ||
                type[k] == GLP_FX)
            {  /* x[k] has upper bound */
                eps = tol_bnd * (1.0 + kappa * Math.abs(ub[k]));
                if (bbar[i] > ub[k] + eps)
                {  /* and violates it */
                    coef[k] = +1.0;
                    cnt++;
                }
            }
        }
        return cnt;
    }

    function set_orig_obj(csa){
        var m = csa.m;
        var n = csa.n;
        var coef = csa.coef;
        var obj = csa.obj;
        var zeta = csa.zeta;
        var i, j;
        for (i = 1; i <= m; i++)
            coef[i] = 0.0;
        for (j = 1; j <= n; j++)
            coef[m+j] = zeta * obj[j];
    }

    function check_stab(csa, tol_bnd){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var type = csa.type;
        var lb = csa.lb;
        var ub = csa.ub;
        var coef = csa.coef;
        var head = csa.head;
        var phase = csa.phase;
        var bbar = csa.bbar;
        var i, k;
        var eps;
        /* walk through the list of basic variables */
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (phase == 1 && coef[k] < 0.0)
            {  /* x[k] must not be greater than its lower bound */
                if (GLP_DEBUG){
                    xassert(type[k] == GLP_LO || type[k] == GLP_DB ||
                        type[k] == GLP_FX);
                }
                eps = tol_bnd * (1.0 + kappa * Math.abs(lb[k]));
                if (bbar[i] > lb[k] + eps) return 1;
            }
            else if (phase == 1 && coef[k] > 0.0)
            {  /* x[k] must not be less than its upper bound */
                if (GLP_DEBUG){
                    xassert(type[k] == GLP_UP || type[k] == GLP_DB ||
                        type[k] == GLP_FX);
                }
                eps = tol_bnd * (1.0 + kappa * Math.abs(ub[k]));
                if (bbar[i] < ub[k] - eps) return 1;
            }
            else
            {  /* either phase = 1 and coef[k] = 0, or phase = 2 */
                if (type[k] == GLP_LO || type[k] == GLP_DB ||
                    type[k] == GLP_FX)
                {  /* x[k] must not be less than its lower bound */
                    eps = tol_bnd * (1.0 + kappa * Math.abs(lb[k]));
                    if (bbar[i] < lb[k] - eps) return 1;
                }
                if (type[k] == GLP_UP || type[k] == GLP_DB ||
                    type[k] == GLP_FX)
                {  /* x[k] must not be greater then its upper bound */
                    eps = tol_bnd * (1.0 + kappa * Math.abs(ub[k]));
                    if (bbar[i] > ub[k] + eps) return 1;
                }
            }
        }
        /* basic solution is primal feasible within a tolerance */
        return 0;
    }

    function check_feas(csa, tol_bnd){
        var m = csa.m;
        if (GLP_DEBUG){
            var n = csa.n;
            var type = csa.type;
        }
        var lb = csa.lb;
        var ub = csa.ub;
        var coef = csa.coef;
        var head = csa.head;
        var bbar = csa.bbar;
        var i, k;
        var eps;
        xassert(csa.phase == 1);
        /* walk through the list of basic variables */
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (coef[k] < 0.0)
            {  /* check if x[k] still violates its lower bound */
                if (GLP_DEBUG){
                    xassert(type[k] == GLP_LO || type[k] == GLP_DB ||
                        type[k] == GLP_FX);
                }
                eps = tol_bnd * (1.0 + kappa * Math.abs(lb[k]));
                if (bbar[i] < lb[k] - eps) return 1;
            }
            else if (coef[k] > 0.0)
            {  /* check if x[k] still violates its upper bound */
                if (GLP_DEBUG){
                    xassert(type[k] == GLP_UP || type[k] == GLP_DB ||
                        type[k] == GLP_FX);
                }
                eps = tol_bnd * (1.0 + kappa * Math.abs(ub[k]));
                if (bbar[i] > ub[k] + eps) return 1;
            }
        }
        /* basic solution is primal feasible within a tolerance */
        return 0;
    }

    function eval_obj(csa){
        var m = csa.m;
        var n = csa.n;
        var obj = csa.obj;
        var head = csa.head;
        var bbar = csa.bbar;
        var i, j, k;
        var sum;
        sum = obj[0];
        /* walk through the list of basic variables */
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (k > m)
                sum += obj[k-m] * bbar[i];
        }
        /* walk through the list of non-basic variables */
        for (j = 1; j <= n; j++)
        {  k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (k > m)
                sum += obj[k-m] * get_xN(csa, j);
        }
        return sum;
    }

    function display(csa, parm, spec){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var type = csa.type;
        var lb = csa.lb;
        var ub = csa.ub;
        var phase = csa.phase;
        var head = csa.head;
        var bbar = csa.bbar;
        var i, k, cnt;
        var sum;
        if (parm.msg_lev < GLP_MSG_ON) return;
        if (parm.out_dly > 0 &&
            1000.0 * xdifftime(xtime(), csa.tm_beg) < parm.out_dly)
            return;
        if (csa.it_cnt == csa.it_dpy) return;
        if (!spec && csa.it_cnt % parm.out_frq != 0) return;
        /* compute the sum of primal infeasibilities and determine the
         number of basic fixed variables */
        sum = 0.0; cnt = 0;
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (type[k] == GLP_LO || type[k] == GLP_DB ||
                type[k] == GLP_FX)
            {  /* x[k] has lower bound */
                if (bbar[i] < lb[k])
                    sum += (lb[k] - bbar[i]);
            }
            if (type[k] == GLP_UP || type[k] == GLP_DB ||
                type[k] == GLP_FX)
            {  /* x[k] has upper bound */
                if (bbar[i] > ub[k])
                    sum += (bbar[i] - ub[k]);
            }
            if (type[k] == GLP_FX) cnt++;
        }
        xprintf((phase == 1 ? ' ' : '*') + csa.it_cnt + ": obj = " + eval_obj(csa) + "  infeas = " + sum + " (" + cnt + ")");
        csa.it_dpy = csa.it_cnt;
    }

    function store_sol(csa, lp, p_stat, d_stat, ray){
        var m = csa.m;
        var n = csa.n;
        var zeta = csa.zeta;
        var head = csa.head;
        var stat = csa.stat;
        var bbar = csa.bbar;
        var cbar = csa.cbar;
        var i, j, k;
        var row, col;
        if (GLP_DEBUG){
            xassert(lp.m == m);
            xassert(lp.n == n);

            /* basis factorization */
            xassert(!lp.valid && lp.bfd == null);
            xassert(csa.valid && csa.bfd != null);
        }
        lp.valid = 1; csa.valid = 0;
        lp.bfd = csa.bfd; csa.bfd = null;
        xcopyArr(lp.head, 1, head, 1, m);
        /* basic solution status */
        lp.pbs_stat = p_stat;
        lp.dbs_stat = d_stat;
        /* objective function value */
        lp.obj_val = eval_obj(csa);
        /* simplex iteration count */
        lp.it_cnt = csa.it_cnt;
        /* unbounded ray */
        lp.some = ray;
        /* basic variables */
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (k <= m)
            {   row = lp.row[k];
                row.stat = GLP_BS;
                row.bind = i;
                row.prim = bbar[i] / row.rii;
                row.dual = 0.0;
            }
            else
            {   col = lp.col[k-m];
                col.stat = GLP_BS;
                col.bind = i;
                col.prim = bbar[i] * col.sjj;
                col.dual = 0.0;
            }
        }
        /* non-basic variables */
        for (j = 1; j <= n; j++)
        {  k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (k <= m)
            {   row = lp.row[k];
                row.stat = stat[j];
                row.bind = 0;
                switch (stat[j])
                {  case GLP_NL:
                    row.prim = row.lb; break;
                    case GLP_NU:
                        row.prim = row.ub; break;
                    case GLP_NF:
                        row.prim = 0.0; break;
                    case GLP_NS:
                        row.prim = row.lb; break;
                    default:
                        xassert(stat != stat);
                }
                row.dual = (cbar[j] * row.rii) / zeta;
            }
            else
            {   col = lp.col[k-m];
                col.stat = stat[j];
                col.bind = 0;
                switch (stat[j])
                {  case GLP_NL:
                    col.prim = col.lb; break;
                    case GLP_NU:
                        col.prim = col.ub; break;
                    case GLP_NF:
                        col.prim = 0.0; break;
                    case GLP_NS:
                        col.prim = col.lb; break;
                    default:
                        xassert(stat != stat);
                }
                col.dual = (cbar[j] / col.sjj) / zeta;
            }
        }
    }


    var csa;
    var binv_st = 2;
    /* status of basis matrix factorization:
     0 - invalid; 1 - just computed; 2 - updated */
    var bbar_st = 0;
    /* status of primal values of basic variables:
     0 - invalid; 1 - just computed; 2 - updated */
    var cbar_st = 0;
    /* status of reduced costs of non-basic variables:
     0 - invalid; 1 - just computed; 2 - updated */
    var rigorous = 0;
    /* rigorous mode flag; this flag is used to enable iterative
     refinement on computing pivot rows and columns of the simplex
     table */
    var check = 0;
    var p_stat, d_stat, ret;
    /* allocate and initialize the common storage area */
    csa = alloc_csa(lp);
    init_csa(csa, lp);
    if (parm.msg_lev >= GLP_MSG_DBG)
        xprintf("Objective scale factor = " + csa.zeta + "");
    while (true){
        /* main loop starts here */
        /* compute factorization of the basis matrix */
        if (binv_st == 0)
        {  ret = invert_B(csa);
            if (ret != 0)
            {  if (parm.msg_lev >= GLP_MSG_ERR)
            {  xprintf("Error: unable to factorize the basis matrix (" + ret + ")");
                xprintf("Sorry, basis recovery procedure not implemented yet");
            }
                xassert(!lp.valid && lp.bfd == null);
                lp.bfd = csa.bfd; csa.bfd = null;
                lp.pbs_stat = lp.dbs_stat = GLP_UNDEF;
                lp.obj_val = 0.0;
                lp.it_cnt = csa.it_cnt;
                lp.some = 0;
                ret = GLP_EFAIL;
                return ret;
            }
            csa.valid = 1;
            binv_st = 1; /* just computed */
            /* invalidate basic solution components */
            bbar_st = cbar_st = 0;
        }
        /* compute primal values of basic variables */
        if (bbar_st == 0)
        {  eval_bbar(csa);
            bbar_st = 1; /* just computed */
            /* determine the search phase, if not determined yet */
            if (csa.phase == 0)
            {  if (set_aux_obj(csa, parm.tol_bnd) > 0)
            {  /* current basic solution is primal infeasible */
                /* start to minimize the sum of infeasibilities */
                csa.phase = 1;
            }
            else
            {  /* current basic solution is primal feasible */
                /* start to minimize the original objective function */
                set_orig_obj(csa);
                csa.phase = 2;
            }
                xassert(check_stab(csa, parm.tol_bnd) == 0);
                /* working objective coefficients have been changed, so
                 invalidate reduced costs */
                cbar_st = 0;
                display(csa, parm, 1);
            }
            /* make sure that the current basic solution remains primal
             feasible (or pseudo feasible on phase I) */
            if (check_stab(csa, parm.tol_bnd))
            {  /* there are excessive bound violations due to round-off
             errors */
                if (parm.msg_lev >= GLP_MSG_ERR)
                    xprintf("Warning: numerical instability (primal simplex, phase " + (csa.phase == 1 ? "I" : "II") + ")");
                /* restart the search */
                csa.phase = 0;
                binv_st = 0;
                rigorous = 5;
                continue;
            }
        }
        xassert(csa.phase == 1 || csa.phase == 2);
        /* on phase I we do not need to wait until the current basic
         solution becomes dual feasible; it is sufficient to make sure
         that no basic variable violates its bounds */
        if (csa.phase == 1 && !check_feas(csa, parm.tol_bnd))
        {  /* the current basis is primal feasible; switch to phase II */
            csa.phase = 2;
            set_orig_obj(csa);
            cbar_st = 0;
            display(csa, parm, 1);
        }
        /* compute reduced costs of non-basic variables */
        if (cbar_st == 0)
        {  eval_cbar(csa);
            cbar_st = 1; /* just computed */
        }
        /* redefine the reference space, if required */
        switch (parm.pricing)
        {  case GLP_PT_STD:
            break;
            case GLP_PT_PSE:
                if (csa.refct == 0) reset_refsp(csa);
                break;
            default:
                xassert(parm != parm);
        }
        /* at this point the basis factorization and all basic solution
         components are valid */
        xassert(binv_st && bbar_st && cbar_st);
        /* check accuracy of current basic solution components (only for
         debugging) */
        if (check)
        {  var e_bbar = err_in_bbar(csa);
            var e_cbar = err_in_cbar(csa);
            var e_gamma =
                (parm.pricing == GLP_PT_PSE ? err_in_gamma(csa) : 0.0);
            xprintf("e_bbar = " + e_bbar + "; e_cbar = " + e_cbar + "; e_gamma = " + e_gamma + "");
            xassert(e_bbar <= 1e-5 && e_cbar <= 1e-5 && e_gamma <= 1e-3);
        }
        /* check if the iteration limit has been exhausted */
        if (parm.it_lim < INT_MAX &&
            csa.it_cnt - csa.it_beg >= parm.it_lim)
        {  if (bbar_st != 1 || csa.phase == 2 && cbar_st != 1)
        {  if (bbar_st != 1) bbar_st = 0;
            if (csa.phase == 2 && cbar_st != 1) cbar_st = 0;
            continue;
        }
            display(csa, parm, 1);
            if (parm.msg_lev >= GLP_MSG_ALL)
                xprintf("ITERATION LIMIT EXCEEDED; SEARCH TERMINATED");
            switch (csa.phase)
            {  case 1:
                p_stat = GLP_INFEAS;
                set_orig_obj(csa);
                eval_cbar(csa);
                break;
                case 2:
                    p_stat = GLP_FEAS;
                    break;
                default:
                    xassert(csa != csa);
            }
            chuzc(csa, parm.tol_dj);
            d_stat = (csa.q == 0 ? GLP_FEAS : GLP_INFEAS);
            store_sol(csa, lp, p_stat, d_stat, 0);
            ret = GLP_EITLIM;
            return ret;
        }
        /* check if the time limit has been exhausted */
        if (parm.tm_lim < INT_MAX &&
            1000.0 * xdifftime(xtime(), csa.tm_beg) >= parm.tm_lim)
        {  if (bbar_st != 1 || csa.phase == 2 && cbar_st != 1)
        {  if (bbar_st != 1) bbar_st = 0;
            if (csa.phase == 2 && cbar_st != 1) cbar_st = 0;
            continue;
        }
            display(csa, parm, 1);
            if (parm.msg_lev >= GLP_MSG_ALL)
                xprintf("TIME LIMIT EXCEEDED; SEARCH TERMINATED");
            switch (csa.phase)
            {  case 1:
                p_stat = GLP_INFEAS;
                set_orig_obj(csa);
                eval_cbar(csa);
                break;
                case 2:
                    p_stat = GLP_FEAS;
                    break;
                default:
                    xassert(csa != csa);
            }
            chuzc(csa, parm.tol_dj);
            d_stat = (csa.q == 0 ? GLP_FEAS : GLP_INFEAS);
            store_sol(csa, lp, p_stat, d_stat, 0);
            ret = GLP_ETMLIM;
            return ret;
        }
        /* display the search progress */
        display(csa, parm, 0);
        /* choose non-basic variable xN[q] */
        chuzc(csa, parm.tol_dj);
        if (csa.q == 0)
        {  if (bbar_st != 1 || cbar_st != 1)
        {  if (bbar_st != 1) bbar_st = 0;
            if (cbar_st != 1) cbar_st = 0;
            continue;
        }
            display(csa, parm, 1);
            switch (csa.phase)
            {  case 1:
                if (parm.msg_lev >= GLP_MSG_ALL)
                    xprintf("PROBLEM HAS NO FEASIBLE SOLUTION");
                p_stat = GLP_NOFEAS;
                set_orig_obj(csa);
                eval_cbar(csa);
                chuzc(csa, parm.tol_dj);
                d_stat = (csa.q == 0 ? GLP_FEAS : GLP_INFEAS);
                break;
                case 2:
                    if (parm.msg_lev >= GLP_MSG_ALL)
                        xprintf("OPTIMAL SOLUTION FOUND");
                    p_stat = d_stat = GLP_FEAS;
                    break;
                default:
                    xassert(csa != csa);
            }
            store_sol(csa, lp, p_stat, d_stat, 0);
            ret = 0;
            return ret;
        }
        /* compute pivot column of the simplex table */
        eval_tcol(csa);
        if (rigorous) refine_tcol(csa);
        sort_tcol(csa, parm.tol_piv);
        /* check accuracy of the reduced cost of xN[q] */
        {  var d1 = csa.cbar[csa.q]; /* less accurate */
            var d2 = reeval_cost(csa);  /* more accurate */
            xassert(d1 != 0.0);
            if (Math.abs(d1 - d2) > 1e-5 * (1.0 + Math.abs(d2)) ||
                !(d1 < 0.0 && d2 < 0.0 || d1 > 0.0 && d2 > 0.0))
            {  if (parm.msg_lev >= GLP_MSG_DBG)
                xprintf("d1 = " + d1 + "; d2 = " + d2 + "");
                if (cbar_st != 1 || !rigorous)
                {  if (cbar_st != 1) cbar_st = 0;
                    rigorous = 5;
                    continue;
                }
            }
            /* replace cbar[q] by more accurate value keeping its sign */
            if (d1 > 0.0)
                csa.cbar[csa.q] = (d2 > 0.0 ? d2 : +DBL_EPSILON);
            else
                csa.cbar[csa.q] = (d2 < 0.0 ? d2 : -DBL_EPSILON);
        }
        /* choose basic variable xB[p] */
        switch (parm.r_test)
        {  case GLP_RT_STD:
            chuzr(csa, 0.0);
            break;
            case GLP_RT_HAR:
                chuzr(csa, 0.30 * parm.tol_bnd);
                break;
            default:
                xassert(parm != parm);
        }
        if (csa.p == 0)
        {  if (bbar_st != 1 || cbar_st != 1 || !rigorous)
        {  if (bbar_st != 1) bbar_st = 0;
            if (cbar_st != 1) cbar_st = 0;
            rigorous = 1;
            continue;
        }
            display(csa, parm, 1);
            switch (csa.phase)
            {  case 1:
                if (parm.msg_lev >= GLP_MSG_ERR)
                    xprintf("Error: unable to choose basic variable on phase I");
                xassert(!lp.valid && lp.bfd == null);
                lp.bfd = csa.bfd; csa.bfd = null;
                lp.pbs_stat = lp.dbs_stat = GLP_UNDEF;
                lp.obj_val = 0.0;
                lp.it_cnt = csa.it_cnt;
                lp.some = 0;
                ret = GLP_EFAIL;
                break;
                case 2:
                    if (parm.msg_lev >= GLP_MSG_ALL)
                        xprintf("PROBLEM HAS UNBOUNDED SOLUTION");
                    store_sol(csa, lp, GLP_FEAS, GLP_NOFEAS,
                        csa.head[csa.m+csa.q]);
                    ret = 0;
                    break;
                default:
                    xassert(csa != csa);
            }
            return ret;
        }
        /* check if the pivot element is acceptable */
        if (csa.p > 0)
        {  var piv = csa.tcol_vec[csa.p];
            var eps = 1e-5 * (1.0 + 0.01 * csa.tcol_max);
            if (Math.abs(piv) < eps)
            {  if (parm.msg_lev >= GLP_MSG_DBG)
                xprintf("piv = " + piv + "; eps = " + eps + "");
                if (!rigorous)
                {  rigorous = 5;
                    continue;
                }
            }
        }
        /* now xN[q] and xB[p] have been chosen anyhow */
        /* compute pivot row of the simplex table */
        if (csa.p > 0)
        {  var rho = csa.work4;
            eval_rho(csa, rho);
            if (rigorous) refine_rho(csa, rho);
            eval_trow(csa, rho);
        }
        /* accuracy check based on the pivot element */
        if (csa.p > 0)
        {  var piv1 = csa.tcol_vec[csa.p]; /* more accurate */
            var piv2 = csa.trow_vec[csa.q]; /* less accurate */
            xassert(piv1 != 0.0);
            if (Math.abs(piv1 - piv2) > 1e-8 * (1.0 + Math.abs(piv1)) ||
                !(piv1 > 0.0 && piv2 > 0.0 || piv1 < 0.0 && piv2 < 0.0))
            {  if (parm.msg_lev >= GLP_MSG_DBG)
                xprintf("piv1 = " + piv1 + "; piv2 = " + piv2 + "");
                if (binv_st != 1 || !rigorous)
                {  if (binv_st != 1) binv_st = 0;
                    rigorous = 5;
                    continue;
                }
                /* use more accurate version in the pivot row */
                if (csa.trow_vec[csa.q] == 0.0)
                {  csa.trow_nnz++;
                    xassert(csa.trow_nnz <= csa.n);
                    csa.trow_ind[csa.trow_nnz] = csa.q;
                }
                csa.trow_vec[csa.q] = piv1;
            }
        }
        /* update primal values of basic variables */
        update_bbar(csa);
        bbar_st = 2; /* updated */
        /* update reduced costs of non-basic variables */
        if (csa.p > 0)
        {  update_cbar(csa);
            cbar_st = 2; /* updated */
            /* on phase I objective coefficient of xB[p] in the adjacent
             basis becomes zero */
            if (csa.phase == 1)
            {  var k = csa.head[csa.p]; /* x[k] = xB[p] . xN[q] */
                csa.cbar[csa.q] -= csa.coef[k];
                csa.coef[k] = 0.0;
            }
        }
        /* update steepest edge coefficients */
        if (csa.p > 0)
        {  switch (parm.pricing)
        {  case GLP_PT_STD:
                break;
            case GLP_PT_PSE:
                if (csa.refct > 0) update_gamma(csa);
                break;
            default:
                xassert(parm != parm);
        }
        }
        /* update factorization of the basis matrix */
        if (csa.p > 0)
        {  ret = update_B(csa, csa.p, csa.head[csa.m+csa.q]);
            if (ret == 0)
                binv_st = 2; /* updated */
            else
            {  csa.valid = 0;
                binv_st = 0; /* invalid */
            }
        }
        /* update matrix N */
        if (csa.p > 0)
        {  del_N_col(csa, csa.q, csa.head[csa.m+csa.q]);
            if (csa.type[csa.head[csa.p]] != GLP_FX)
                add_N_col(csa, csa.q, csa.head[csa.p]);
        }
        /* change the basis header */
        change_basis(csa);
        /* iteration complete */
        csa.it_cnt++;
        if (rigorous > 0) rigorous--;
        continue;
    }

    /* return to the calling program */
    return ret;
}

function spx_dual(lp, parm){

    const kappa = 0.10;

    function alloc_csa(lp){
        var m = lp.m;
        var n = lp.n;
        var nnz = lp.nnz;
        var csa = {};
        xassert(m > 0 && n > 0);
        csa.m = m;
        csa.n = n;
        csa.type = new Array(1+m+n);
        csa.lb = new Array(1+m+n);
        csa.ub = new Array(1+m+n);
        csa.coef = new Array(1+m+n);
        csa.orig_type = new Array(1+m+n);
        csa.orig_lb = new Array(1+m+n);
        csa.orig_ub = new Array(1+m+n);
        csa.obj = new Array(1+n);
        csa.A_ptr = new Array(1+n+1);
        csa.A_ind = new Array(1+nnz);
        csa.A_val = new Array(1+nnz);
        csa.AT_ptr = new Array(1+m+1);
        csa.AT_ind = new Array(1+nnz);
        csa.AT_val = new Array(1+nnz);
        csa.head = new Array(1+m+n);
        csa.bind = new Array(1+m+n);
        csa.stat = new Array(1+n);
        csa.bbar = new Array(1+m);
        csa.cbar = new Array(1+n);
        csa.refsp = new Array(1+m+n);
        csa.gamma = new Array(1+m);
        csa.trow_ind = new Array(1+n);
        csa.trow_vec = new Array(1+n);
        csa.tcol_ind = new Array(1+m);
        csa.tcol_vec = new Array(1+m);
        csa.work1 = new Array(1+m);
        csa.work2 = new Array(1+m);
        csa.work3 = new Array(1+m);
        csa.work4 = new Array(1+m);
        return csa;
    }

    function init_csa(csa, lp){
        var m = csa.m;
        var n = csa.n;
        var type = csa.type;
        var lb = csa.lb;
        var ub = csa.ub;
        var coef = csa.coef;
        var orig_type = csa.orig_type;
        var orig_lb = csa.orig_lb;
        var orig_ub = csa.orig_ub;
        var obj = csa.obj;
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var AT_ptr = csa.AT_ptr;
        var AT_ind = csa.AT_ind;
        var AT_val = csa.AT_val;
        var head = csa.head;
        var bind = csa.bind;
        var stat = csa.stat;
        var refsp = csa.refsp;
        var gamma = csa.gamma;
        var i, j, k, loc;
        var cmax, aij, row, col;
        /* auxiliary variables */
        for (i = 1; i <= m; i++)
        {  row = lp.row[i];
            type[i] = row.type;
            lb[i] = row.lb * row.rii;
            ub[i] = row.ub * row.rii;
            coef[i] = 0.0;
        }
        /* structural variables */
        for (j = 1; j <= n; j++)
        {  col = lp.col[j];
            type[m+j] = col.type;
            lb[m+j] = col.lb / col.sjj;
            ub[m+j] = col.ub / col.sjj;
            coef[m+j] = col.coef * col.sjj;
        }
        /* original bounds of variables */
        xcopyArr(orig_type, 1, type, 1, m+n);
        xcopyArr(orig_lb, 1, lb, 1, m+n);
        xcopyArr(orig_ub, 1, ub, 1, m+n);
        /* original objective function */
        obj[0] = lp.c0;
        xcopyArr(obj, 1, coef, m+1, n);
        /* factor used to scale original objective coefficients */
        cmax = 0.0;
        for (j = 1; j <= n; j++)
            if (cmax < Math.abs(obj[j])) cmax = Math.abs(obj[j]);
        if (cmax == 0.0) cmax = 1.0;
        switch (lp.dir)
        {  case GLP_MIN:
            csa.zeta = + 1.0 / cmax;
            break;
            case GLP_MAX:
                csa.zeta = - 1.0 / cmax;
                break;
            default:
                xassert(lp != lp);
        }
        if (Math.abs(csa.zeta) < 1.0) csa.zeta *= 1000.0;
        /* scale working objective coefficients */
        for (j = 1; j <= n; j++) coef[m+j] *= csa.zeta;
        /* matrix A (by columns) */
        loc = 1;
        for (j = 1; j <= n; j++)
        {
            A_ptr[j] = loc;
            for (aij = lp.col[j].ptr; aij != null; aij = aij.c_next)
            {  A_ind[loc] = aij.row.i;
                A_val[loc] = aij.row.rii * aij.val * aij.col.sjj;
                loc++;
            }
        }
        A_ptr[n+1] = loc;
        xassert(loc-1 == lp.nnz);
        /* matrix A (by rows) */
        loc = 1;
        for (i = 1; i <= m; i++)
        {
            AT_ptr[i] = loc;
            for (aij = lp.row[i].ptr; aij != null; aij = aij.r_next)
            {  AT_ind[loc] = aij.col.j;
                AT_val[loc] = aij.row.rii * aij.val * aij.col.sjj;
                loc++;
            }
        }
        AT_ptr[m+1] = loc;
        xassert(loc-1 == lp.nnz);
        /* basis header */
        xassert(lp.valid);
        xcopyArr(head, 1, lp.head, 1, m);
        k = 0;
        for (i = 1; i <= m; i++)
        {  row = lp.row[i];
            if (row.stat != GLP_BS)
            {  k++;
                xassert(k <= n);
                head[m+k] = i;
                stat[k] = row.stat;
            }
        }
        for (j = 1; j <= n; j++)
        {  col = lp.col[j];
            if (col.stat != GLP_BS)
            {  k++;
                xassert(k <= n);
                head[m+k] = m + j;
                stat[k] = col.stat;
            }
        }
        xassert(k == n);
        for (k = 1; k <= m+n; k++)
            bind[head[k]] = k;
        /* factorization of matrix B */
        csa.valid = 1; lp.valid = 0;
        csa.bfd = lp.bfd; lp.bfd = null;
        /* working parameters */
        csa.phase = 0;
        csa.tm_beg = xtime();
        csa.it_beg = csa.it_cnt = lp.it_cnt;
        csa.it_dpy = -1;
        /* reference space and steepest edge coefficients */
        csa.refct = 0;
        xfillArr(refsp, 1, 0, m+n);
        for (i = 1; i <= m; i++) gamma[i] = 1.0;
    }

    function inv_col(csa, i, ind, val){
        /* this auxiliary routine returns row indices and numeric values
         of non-zero elements of i-th column of the basis matrix */
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var k, len, ptr, t;
        if (GLP_DEBUG){xassert(1 <= i && i <= m)}
        k = head[i]; /* B[i] is k-th column of (I|-A) */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        if (k <= m)
        {  /* B[i] is k-th column of submatrix I */
            len = 1;
            ind[1] = k;
            val[1] = 1.0;
        }
        else
        {  /* B[i] is (k-m)-th column of submatrix (-A) */
            ptr = A_ptr[k-m];
            len = A_ptr[k-m+1] - ptr;
            xcopyArr(ind, 1, A_ind, ptr, len);
            xcopyArr(val, 1, A_val, ptr, len);
            for (t = 1; t <= len; t++) val[t] = - val[t];
        }
        return len;
    }

    function invert_B(csa){
        var ret = bfd_factorize(csa.bfd, csa.m, null, inv_col, csa);
        csa.valid = (ret == 0);
        return ret;
    }

    function update_B(csa, i, k)
    {   var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var ret, val;
        if (GLP_DEBUG){
            xassert(1 <= i && i <= m);
            xassert(1 <= k && k <= m+n);
        }
        if (k <= m)
        {  /* new i-th column of B is k-th column of I */
            var ind = new Array(1+1);
            val = new Array(1+1);
            ind[1] = k;
            val[1] = 1.0;
            xassert(csa.valid);
            ret = bfd_update_it(csa.bfd, i, 0, 1, ind, 0, val);
        }
        else
        {  /* new i-th column of B is (k-m)-th column of (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var A_val = csa.A_val;
            val = csa.work1;
            var beg, end, ptr, len;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            len = 0;
            for (ptr = beg; ptr < end; ptr++)
                val[++len] = - A_val[ptr];
            xassert(csa.valid);
            ret = bfd_update_it(csa.bfd, i, 0, len, A_ind, beg-1, val);
        }
        csa.valid = (ret == 0);
        return ret;
    }

    function error_ftran(csa, h, x, r){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var i, k, beg, end, ptr;
        var temp;
        /* compute the residual vector:
         r = h - B * x = h - B[1] * x[1] - ... - B[m] * x[m],
         where B[1], ..., B[m] are columns of matrix B */
        xcopyArr(r, 1, h, 1, m);
        for (i = 1; i <= m; i++)
        {  temp = x[i];
            if (temp == 0.0) continue;
            k = head[i]; /* B[i] is k-th column of (I|-A) */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (k <= m)
            {  /* B[i] is k-th column of submatrix I */
                r[k] -= temp;
            }
            else
            {  /* B[i] is (k-m)-th column of submatrix (-A) */
                beg = A_ptr[k-m];
                end = A_ptr[k-m+1];
                for (ptr = beg; ptr < end; ptr++)
                    r[A_ind[ptr]] += A_val[ptr] * temp;
            }
        }
    }

    function refine_ftran(csa, h, x){
        var m = csa.m;
        var r = csa.work1;
        var d = csa.work1;
        var i;
        /* compute the residual vector r = h - B * x */
        error_ftran(csa, h, x, r);
        /* compute the correction vector d = inv(B) * r */
        xassert(csa.valid);
        bfd_ftran(csa.bfd, d);
        /* refine the solution vector (new x) = (old x) + d */
        for (i = 1; i <= m; i++) x[i] += d[i];
    }

    function error_btran(csa, h, x, r){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var i, k, beg, end, ptr;
        var temp;
        /* compute the residual vector r = b - B'* x */
        for (i = 1; i <= m; i++)
        {  /* r[i] := b[i] - (i-th column of B)'* x */
            k = head[i]; /* B[i] is k-th column of (I|-A) */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            temp = h[i];
            if (k <= m)
            {  /* B[i] is k-th column of submatrix I */
                temp -= x[k];
            }
            else
            {  /* B[i] is (k-m)-th column of submatrix (-A) */
                beg = A_ptr[k-m];
                end = A_ptr[k-m+1];
                for (ptr = beg; ptr < end; ptr++)
                    temp += A_val[ptr] * x[A_ind[ptr]];
            }
            r[i] = temp;
        }
    }

    function refine_btran(csa, h, x){
        var m = csa.m;
        var r = csa.work1;
        var d = csa.work1;
        var i;
        /* compute the residual vector r = h - B'* x */
        error_btran(csa, h, x, r);
        /* compute the correction vector d = inv(B') * r */
        xassert(csa.valid);
        bfd_btran(csa.bfd, d);
        /* refine the solution vector (new x) = (old x) + d */
        for (i = 1; i <= m; i++) x[i] += d[i];
    }

    function get_xN(csa, j){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var lb = csa.lb;
        var ub = csa.ub;
        var head = csa.head;
        var stat = csa.stat;
        var k;
        var xN;
        if (GLP_DEBUG){xassert(1 <= j && j <= n)}
        k = head[m+j]; /* x[k] = xN[j] */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        switch (stat[j])
        {  case GLP_NL:
            /* x[k] is on its lower bound */
            xN = lb[k]; break;
            case GLP_NU:
                /* x[k] is on its upper bound */
                xN = ub[k]; break;
            case GLP_NF:
                /* x[k] is free non-basic variable */
                xN = 0.0; break;
            case GLP_NS:
                /* x[k] is fixed non-basic variable */
                xN = lb[k]; break;
            default:
                xassert(stat != stat);
        }
        return xN;
    }

    function eval_beta(csa, beta){
        var m = csa.m;
        var n = csa.n;
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var h = csa.work2;
        var i, j, k, beg, end, ptr;
        var xN;
        /* compute the right-hand side vector:
         h := - N * xN = - N[1] * xN[1] - ... - N[n] * xN[n],
         where N[1], ..., N[n] are columns of matrix N */
        for (i = 1; i <= m; i++)
            h[i] = 0.0;
        for (j = 1; j <= n; j++)
        {   k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            /* determine current value of xN[j] */
            xN = get_xN(csa, j);
            if (xN == 0.0) continue;
            if (k <= m)
            {  /* N[j] is k-th column of submatrix I */
                h[k] -= xN;
            }
            else
            {  /* N[j] is (k-m)-th column of submatrix (-A) */
                beg = A_ptr[k-m];
                end = A_ptr[k-m+1];
                for (ptr = beg; ptr < end; ptr++)
                    h[A_ind[ptr]] += xN * A_val[ptr];
            }
        }
        /* solve system B * beta = h */
        xcopyArr(beta, 1, h, 1, m);
        xassert(csa.valid);
        bfd_ftran(csa.bfd, beta);
        /* and refine the solution */
        refine_ftran(csa, h, beta);
    }

    function eval_pi(csa, pi){
        var m = csa.m;
        var c = csa.coef;
        var head = csa.head;
        var cB = csa.work2;
        var i;
        /* construct the right-hand side vector cB */
        for (i = 1; i <= m; i++)
            cB[i] = c[head[i]];
        /* solve system B'* pi = cB */
        xcopyArr(pi, 1, cB, 1, m);
        xassert(csa.valid);
        bfd_btran(csa.bfd, pi);
        /* and refine the solution */
        refine_btran(csa, cB, pi);
    }

    function eval_cost(csa, pi, j){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var coef = csa.coef;
        var head = csa.head;
        var k;
        var dj;
        if (GLP_DEBUG){xassert(1 <= j && j <= n)}
        k = head[m+j]; /* x[k] = xN[j] */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        dj = coef[k];
        if (k <= m)
        {  /* N[j] is k-th column of submatrix I */
            dj -= pi[k];
        }
        else
        {  /* N[j] is (k-m)-th column of submatrix (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var A_val = csa.A_val;
            var beg, end, ptr;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            for (ptr = beg; ptr < end; ptr++)
                dj += A_val[ptr] * pi[A_ind[ptr]];
        }
        return dj;
    }

    function eval_bbar(csa){
        eval_beta(csa, csa.bbar);
    }

    function eval_cbar(csa){
        if (GLP_DEBUG){var m = csa.m}
        var n = csa.n;
        if (GLP_DEBUG){var head = csa.head}
        var cbar = csa.cbar;
        var pi = csa.work3;
        var j;
        if (GLP_DEBUG){var k}
        /* compute simplex multipliers */
        eval_pi(csa, pi);
        /* compute and store reduced costs */
        for (j = 1; j <= n; j++)
        {
            if (GLP_DEBUG){
                k = head[m+j]; /* x[k] = xN[j] */
                xassert(1 <= k && k <= m+n);
            }
            cbar[j] = eval_cost(csa, pi, j);
        }
    }

    function reset_refsp(csa){
        var m = csa.m;
        var n = csa.n;
        var head = csa.head;
        var refsp = csa.refsp;
        var gamma = csa.gamma;
        var i, k;
        xassert(csa.refct == 0);
        csa.refct = 1000;
        xfillArr(refsp, 1, 0, m+n);
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            refsp[k] = 1;
            gamma[i] = 1.0;
        }
    }

    function eval_gamma(csa, gamma){
        var m = csa.m;
        var n = csa.n;
        var type = csa.type;
        var head = csa.head;
        var refsp = csa.refsp;
        var alfa = csa.work3;
        var h = csa.work3;
        var i, j, k;
        /* gamma[i] := eta[i] (or 1, if xB[i] is free) */
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            if (type[k] == GLP_FR)
                gamma[i] = 1.0;
            else
                gamma[i] = (refsp[k] ? 1.0 : 0.0);
        }
        /* compute columns of the current simplex table */
        for (j = 1; j <= n; j++)
        {  k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            /* skip column, if xN[j] is not in C */
            if (!refsp[k]) continue;
            if (GLP_DEBUG){
                /* set C must not contain fixed variables */
                xassert(type[k] != GLP_FX);
            }
            /* construct the right-hand side vector h = - N[j] */
            for (i = 1; i <= m; i++)
                h[i] = 0.0;
            if (k <= m)
            {  /* N[j] is k-th column of submatrix I */
                h[k] = -1.0;
            }
            else
            {  /* N[j] is (k-m)-th column of submatrix (-A) */
                var A_ptr = csa.A_ptr;
                var A_ind = csa.A_ind;
                var A_val = csa.A_val;
                var beg, end, ptr;
                beg = A_ptr[k-m];
                end = A_ptr[k-m+1];
                for (ptr = beg; ptr < end; ptr++)
                    h[A_ind[ptr]] = A_val[ptr];
            }
            /* solve system B * alfa = h */
            xassert(csa.valid);
            bfd_ftran(csa.bfd, alfa);
            /* gamma[i] := gamma[i] + alfa[i,j]^2 */
            for (i = 1; i <= m; i++)
            {  k = head[i]; /* x[k] = xB[i] */
                if (type[k] != GLP_FR)
                    gamma[i] += alfa[i] * alfa[i];
            }
        }
    }

    function chuzr(csa, tol_bnd){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var type = csa.type;
        var lb = csa.lb;
        var ub = csa.ub;
        var head = csa.head;
        var bbar = csa.bbar;
        var gamma = csa.gamma;
        var i, k, p;
        var delta, best, eps, ri, temp;
        /* nothing is chosen so far */
        p = 0; delta = 0.0; best = 0.0;
        /* look through the list of basic variables */
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            /* determine bound violation ri[i] */
            ri = 0.0;
            if (type[k] == GLP_LO || type[k] == GLP_DB ||
                type[k] == GLP_FX)
            {  /* xB[i] has lower bound */
                eps = tol_bnd * (1.0 + kappa * Math.abs(lb[k]));
                if (bbar[i] < lb[k] - eps)
                {  /* and significantly violates it */
                    ri = lb[k] - bbar[i];
                }
            }
            if (type[k] == GLP_UP || type[k] == GLP_DB ||
                type[k] == GLP_FX)
            {  /* xB[i] has upper bound */
                eps = tol_bnd * (1.0 + kappa * Math.abs(ub[k]));
                if (bbar[i] > ub[k] + eps)
                {  /* and significantly violates it */
                    ri = ub[k] - bbar[i];
                }
            }
            /* if xB[i] is not eligible, skip it */
            if (ri == 0.0) continue;
            /* xB[i] is eligible basic variable; choose one with largest
             weighted bound violation */
            if (GLP_DEBUG){xassert(gamma[i] >= 0.0)}
            temp = gamma[i];
            if (temp < DBL_EPSILON) temp = DBL_EPSILON;
            temp = (ri * ri) / temp;
            if (best < temp){
                p = i; delta = ri; best = temp;
            }
        }
        /* store the index of basic variable xB[p] chosen and its change
         in the adjacent basis */
        csa.p = p;
        csa.delta = delta;
    }

    function eval_rho(csa, e){
        var m = csa.m;
        var p = csa.p;
        var i;
        if (GLP_DEBUG){xassert(1 <= p && p <= m)}
        /* construct the right-hand side vector e[p] */
        for (i = 1; i <= m; i++)
            e[i] = 0.0;
        e[p] = 1.0;
        /* solve system B'* rho = e[p] */
        xassert(csa.valid);
        bfd_btran(csa.bfd, rho);
    }

    function refine_rho(csa, rho){
        var m = csa.m;
        var p = csa.p;
        var e = csa.work3;
        var i;
        if (GLP_DEBUG){xassert(1 <= p && p <= m)}
        /* construct the right-hand side vector e[p] */
        for (i = 1; i <= m; i++)
            e[i] = 0.0;
        e[p] = 1.0;
        /* refine solution of B'* rho = e[p] */
        refine_btran(csa, e, rho);
    }

    function eval_trow1(csa, rho){
        var m = csa.m;
        var n = csa.n;
        var A_ptr = csa.A_ptr;
        var A_ind = csa.A_ind;
        var A_val = csa.A_val;
        var head = csa.head;
        var stat = csa.stat;
        var trow_ind = csa.trow_ind;
        var trow_vec = csa.trow_vec;
        var j, k, beg, end, ptr, nnz;
        var temp;
        /* compute the pivot row as inner products of columns of the
         matrix N and vector rho: trow[j] = - rho * N[j] */
        nnz = 0;
        for (j = 1; j <= n; j++)
        {  if (stat[j] == GLP_NS)
        {  /* xN[j] is fixed */
            trow_vec[j] = 0.0;
            continue;
        }
            k = head[m+j]; /* x[k] = xN[j] */
            if (k <= m)
            {  /* N[j] is k-th column of submatrix I */
                temp = - rho[k];
            }
            else
            {  /* N[j] is (k-m)-th column of submatrix (-A) */
                beg = A_ptr[k-m]; end = A_ptr[k-m+1];
                temp = 0.0;
                for (ptr = beg; ptr < end; ptr++)
                    temp += rho[A_ind[ptr]] * A_val[ptr];
            }
            if (temp != 0.0)
                trow_ind[++nnz] = j;
            trow_vec[j] = temp;
        }
        csa.trow_nnz = nnz;
    }

    function eval_trow2(csa, rho){
        var m = csa.m;
        var n = csa.n;
        var AT_ptr = csa.AT_ptr;
        var AT_ind = csa.AT_ind;
        var AT_val = csa.AT_val;
        var bind = csa.bind;
        var stat = csa.stat;
        var trow_ind = csa.trow_ind;
        var trow_vec = csa.trow_vec;
        var i, j, beg, end, ptr, nnz;
        var temp;
        /* clear the pivot row */
        for (j = 1; j <= n; j++)
            trow_vec[j] = 0.0;
        /* compute the pivot row as a linear combination of rows of the
         matrix N: trow = - rho[1] * N'[1] - ... - rho[m] * N'[m] */
        for (i = 1; i <= m; i++)
        {  temp = rho[i];
            if (temp == 0.0) continue;
            /* trow := trow - rho[i] * N'[i] */
            j = bind[i] - m; /* x[i] = xN[j] */
            if (j >= 1 && stat[j] != GLP_NS)
                trow_vec[j] -= temp;
            beg = AT_ptr[i]; end = AT_ptr[i+1];
            for (ptr = beg; ptr < end; ptr++)
            {  j = bind[m + AT_ind[ptr]] - m; /* x[k] = xN[j] */
                if (j >= 1 && stat[j] != GLP_NS)
                    trow_vec[j] += temp * AT_val[ptr];
            }
        }
        /* construct sparse pattern of the pivot row */
        nnz = 0;
        for (j = 1; j <= n; j++)
        {  if (trow_vec[j] != 0.0)
            trow_ind[++nnz] = j;
        }
        csa.trow_nnz = nnz;
    }

    function eval_trow(csa, rho){
        var m = csa.m;
        var i, nnz;
        var dens;
        /* determine the density of the vector rho */
        nnz = 0;
        for (i = 1; i <= m; i++)
            if (rho[i] != 0.0) nnz++;
        dens = nnz / m;
        if (dens >= 0.20)
        {  /* rho is relatively dense */
            eval_trow1(csa, rho);
        }
        else
        {  /* rho is relatively sparse */
            eval_trow2(csa, rho);
        }
    }

    function sort_trow(csa, tol_piv){
        if (GLP_DEBUG){
            var n = csa.n;
            var stat = csa.stat;
        }
        var nnz = csa.trow_nnz;
        var trow_ind = csa.trow_ind;
        var trow_vec = csa.trow_vec;
        var j, num, pos;
        var big, eps, temp;
        /* compute infinity (maximum) norm of the row */
        big = 0.0;
        for (pos = 1; pos <= nnz; pos++)
        {
            if (GLP_DEBUG){
                j = trow_ind[pos];
                xassert(1 <= j && j <= n);
                xassert(stat[j] != GLP_NS);
            }
            temp = Math.abs(trow_vec[trow_ind[pos]]);
            if (big < temp) big = temp;
        }
        csa.trow_max = big;
        /* determine absolute pivot tolerance */
        eps = tol_piv * (1.0 + 0.01 * big);
        /* move significant row components to the front of the list */
        for (num = 0; num < nnz; )
        {  j = trow_ind[nnz];
            if (Math.abs(trow_vec[j]) < eps)
                nnz--;
            else
            {  num++;
                trow_ind[nnz] = trow_ind[num];
                trow_ind[num] = j;
            }
        }
        csa.trow_num = num;
    }

    function chuzc(csa, rtol){
        if (GLP_DEBUG){
            var m = csa.m;
            var n = csa.n;
        }
        var stat = csa.stat;
        var cbar = csa.cbar;
        if (GLP_DEBUG){
            var p = csa.p;
        }
        var delta = csa.delta;
        var trow_ind = csa.trow_ind;
        var trow_vec = csa.trow_vec;
        var trow_num = csa.trow_num;
        var j, pos, q;
        var alfa, big, s, t, teta, tmax;
        if (GLP_DEBUG){xassert(1 <= p && p <= m)}
        /* delta > 0 means that xB[p] violates its lower bound and goes
         to it in the adjacent basis, so lambdaB[p] is increasing from
         its lower zero bound;
         delta < 0 means that xB[p] violates its upper bound and goes
         to it in the adjacent basis, so lambdaB[p] is decreasing from
         its upper zero bound */
        if (GLP_DEBUG){xassert(delta != 0.0)}
        /* s := sign(delta) */
        s = (delta > 0.0 ? +1.0 : -1.0);
        /*** FIRST PASS ***/
        /* nothing is chosen so far */
        q = 0; teta = DBL_MAX; big = 0.0;
        /* walk through significant elements of the pivot row */
        for (pos = 1; pos <= trow_num; pos++)
        {  j = trow_ind[pos];
            if (GLP_DEBUG){xassert(1 <= j && j <= n)}
            alfa = s * trow_vec[j];
            if (GLP_DEBUG){xassert(alfa != 0.0)}
            /* lambdaN[j] = ... - alfa * lambdaB[p] - ..., and due to s we
             need to consider only increasing lambdaB[p] */
            if (alfa > 0.0)
            {  /* lambdaN[j] is decreasing */
                if (stat[j] == GLP_NL || stat[j] == GLP_NF)
                {  /* lambdaN[j] has zero lower bound */
                    t = (cbar[j] + rtol) / alfa;
                }
                else
                {  /* lambdaN[j] has no lower bound */
                    continue;
                }
            }
            else
            {  /* lambdaN[j] is increasing */
                if (stat[j] == GLP_NU || stat[j] == GLP_NF)
                {  /* lambdaN[j] has zero upper bound */
                    t = (cbar[j] - rtol) / alfa;
                }
                else
                {  /* lambdaN[j] has no upper bound */
                    continue;
                }
            }
            /* t is a change of lambdaB[p], on which lambdaN[j] reaches
             its zero bound (possibly relaxed); since the basic solution
             is assumed to be dual feasible, t has to be non-negative by
             definition; however, it may happen that lambdaN[j] slightly
             (i.e. within a tolerance) violates its zero bound, that
             leads to negative t; in the latter case, if xN[j] is chosen,
             negative t means that lambdaB[p] changes in wrong direction
             that may cause wrong results on updating reduced costs;
             thus, if t is negative, we should replace it by exact zero
             assuming that lambdaN[j] is exactly on its zero bound, and
             violation appears due to round-off errors */
            if (t < 0.0) t = 0.0;
            /* apply minimal ratio test */
            if (teta > t || teta == t && big < Math.abs(alfa)){
                q = j; teta = t; big = Math.abs(alfa);
            }

        }
        /* the second pass is skipped in the following cases: */
        /* if the standard ratio test is used */
        if (rtol == 0.0) return done();
        /* if no non-basic variable has been chosen on the first pass */
        if (q == 0) return done();
        /* if lambdaN[q] prevents lambdaB[p] from any change */
        if (teta == 0.0) return done();
        /*** SECOND PASS ***/
        /* here tmax is a maximal change of lambdaB[p], on which the
         solution remains dual feasible within a tolerance */
        tmax = teta;
        /* nothing is chosen so far */
        q = 0; teta = DBL_MAX; big = 0.0;
        /* walk through significant elements of the pivot row */
        for (pos = 1; pos <= trow_num; pos++)
        {  j = trow_ind[pos];
            if (GLP_DEBUG){xassert(1 <= j && j <= n)}
            alfa = s * trow_vec[j];
            if (GLP_DEBUG){xassert(alfa != 0.0)}
            /* lambdaN[j] = ... - alfa * lambdaB[p] - ..., and due to s we
             need to consider only increasing lambdaB[p] */
            if (alfa > 0.0)
            {  /* lambdaN[j] is decreasing */
                if (stat[j] == GLP_NL || stat[j] == GLP_NF)
                {  /* lambdaN[j] has zero lower bound */
                    t = cbar[j] / alfa;
                }
                else
                {  /* lambdaN[j] has no lower bound */
                    continue;
                }
            }
            else
            {  /* lambdaN[j] is increasing */
                if (stat[j] == GLP_NU || stat[j] == GLP_NF)
                {  /* lambdaN[j] has zero upper bound */
                    t = cbar[j] / alfa;
                }
                else
                {  /* lambdaN[j] has no upper bound */
                    continue;
                }
            }
            /* (see comments for the first pass) */
            if (t < 0.0) t = 0.0;
            /* t is a change of lambdaB[p], on which lambdaN[j] reaches
             its zero (lower or upper) bound; if t <= tmax, all reduced
             costs can violate their zero bounds only within relaxation
             tolerance rtol, so we can choose non-basic variable having
             largest influence coefficient to avoid possible numerical
             instability */
            if (t <= tmax && big < Math.abs(alfa)){
                q = j; teta = t; big = Math.abs(alfa);
            }
        }
        /* something must be chosen on the second pass */
        xassert(q != 0);

        function done(){
            /* store the index of non-basic variable xN[q] chosen */
            csa.q = q;
            /* store reduced cost of xN[q] in the adjacent basis */
            csa.new_dq = s * teta;
        }
        done();
    }

    function eval_tcol(csa){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var head = csa.head;
        var q = csa.q;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var h = csa.tcol_vec;
        var i, k, nnz;
        if (GLP_DEBUG){xassert(1 <= q && q <= n)}
        k = head[m+q]; /* x[k] = xN[q] */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        /* construct the right-hand side vector h = - N[q] */
        for (i = 1; i <= m; i++)
            h[i] = 0.0;
        if (k <= m)
        {  /* N[q] is k-th column of submatrix I */
            h[k] = -1.0;
        }
        else
        {  /* N[q] is (k-m)-th column of submatrix (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var A_val = csa.A_val;
            var beg, end, ptr;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            for (ptr = beg; ptr < end; ptr++)
                h[A_ind[ptr]] = A_val[ptr];
        }
        /* solve system B * tcol = h */
        xassert(csa.valid);
        bfd_ftran(csa.bfd, tcol_vec);
        /* construct sparse pattern of the pivot column */
        nnz = 0;
        for (i = 1; i <= m; i++)
        {  if (tcol_vec[i] != 0.0)
            tcol_ind[++nnz] = i;
        }
        csa.tcol_nnz = nnz;
    }

    function refine_tcol(csa){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var head = csa.head;
        var q = csa.q;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var h = csa.work3;
        var i, k, nnz;
        if (GLP_DEBUG){xassert(1 <= q && q <= n)}
        k = head[m+q]; /* x[k] = xN[q] */
        if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
        /* construct the right-hand side vector h = - N[q] */
        for (i = 1; i <= m; i++)
            h[i] = 0.0;
        if (k <= m)
        {  /* N[q] is k-th column of submatrix I */
            h[k] = -1.0;
        }
        else
        {  /* N[q] is (k-m)-th column of submatrix (-A) */
            var A_ptr = csa.A_ptr;
            var A_ind = csa.A_ind;
            var A_val = csa.A_val;
            var beg, end, ptr;
            beg = A_ptr[k-m];
            end = A_ptr[k-m+1];
            for (ptr = beg; ptr < end; ptr++)
                h[A_ind[ptr]] = A_val[ptr];
        }
        /* refine solution of B * tcol = h */
        refine_ftran(csa, h, tcol_vec);
        /* construct sparse pattern of the pivot column */
        nnz = 0;
        for (i = 1; i <= m; i++)
        {  if (tcol_vec[i] != 0.0)
            tcol_ind[++nnz] = i;
        }
        csa.tcol_nnz = nnz;
    }

    function update_cbar(csa){
        if (GLP_DEBUG){var n = csa.n}
        var cbar = csa.cbar;
        var trow_nnz = csa.trow_nnz;
        var trow_ind = csa.trow_ind;
        var trow_vec = csa.trow_vec;
        var q = csa.q;
        var new_dq = csa.new_dq;
        var j, pos;
        if (GLP_DEBUG){xassert(1 <= q && q <= n)}
        /* set new reduced cost of xN[q] */
        cbar[q] = new_dq;
        /* update reduced costs of other non-basic variables */
        if (new_dq == 0.0) return;
        for (pos = 1; pos <= trow_nnz; pos++)
        {  j = trow_ind[pos];
            if (GLP_DEBUG){xassert(1 <= j && j <= n)}
            if (j != q)
                cbar[j] -= trow_vec[j] * new_dq;
        }
    }

    function update_bbar(csa){
        if (GLP_DEBUG){
            var m = csa.m;
            var n = csa.n;
        }
        var bbar = csa.bbar;
        var p = csa.p;
        var delta = csa.delta;
        var q = csa.q;
        var tcol_nnz = csa.tcol_nnz;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var i, pos;
        var teta;
        if (GLP_DEBUG){
            xassert(1 <= p && p <= m);
            xassert(1 <= q && q <= n);
            /* determine the change of xN[q] in the adjacent basis */
            xassert(tcol_vec[p] != 0.0);
        }
        teta = delta / tcol_vec[p];
        /* set new primal value of xN[q] */
        bbar[p] = get_xN(csa, q) + teta;
        /* update primal values of other basic variables */
        if (teta == 0.0) return;
        for (pos = 1; pos <= tcol_nnz; pos++)
        {  i = tcol_ind[pos];
            if (GLP_DEBUG){xassert(1 <= i && i <= m)}
            if (i != p)
                bbar[i] += tcol_vec[i] * teta;
        }
    }

    function update_gamma(csa){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var type = csa.type;
        var head = csa.head;
        var refsp = csa.refsp;
        var gamma = csa.gamma;
        var p = csa.p;
        var trow_nnz = csa.trow_nnz;
        var trow_ind = csa.trow_ind;
        var trow_vec = csa.trow_vec;
        var q = csa.q;
        var tcol_nnz = csa.tcol_nnz;
        var tcol_ind = csa.tcol_ind;
        var tcol_vec = csa.tcol_vec;
        var u = csa.work3;
        var i, j, k,pos;
        var gamma_p, eta_p, pivot, t, t1, t2;
        if (GLP_DEBUG){
            xassert(1 <= p && p <= m);
            xassert(1 <= q && q <= n);
        }
        /* the basis changes, so decrease the count */
        xassert(csa.refct > 0);
        csa.refct--;
        /* recompute gamma[p] for the current basis more accurately and
         compute auxiliary vector u */
        if (GLP_DEBUG){xassert(type[head[p]] != GLP_FR)}
        gamma_p = eta_p = (refsp[head[p]] ? 1.0 : 0.0);
        for (i = 1; i <= m; i++) u[i] = 0.0;
        for (pos = 1; pos <= trow_nnz; pos++)
        {   j = trow_ind[pos];
            if (GLP_DEBUG){xassert(1 <= j && j <= n)}
            k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG){
                xassert(1 <= k && k <= m+n);
                xassert(type[k] != GLP_FX);
            }
            if (!refsp[k]) continue;
            t = trow_vec[j];
            gamma_p += t * t;
            /* u := u + N[j] * delta[j] * trow[j] */
            if (k <= m)
            {  /* N[k] = k-j stolbec submatrix I */
                u[k] += t;
            }
            else
            {  /* N[k] = k-m-k stolbec (-A) */
                var A_ptr = csa.A_ptr;
                var A_ind = csa.A_ind;
                var A_val = csa.A_val;
                var beg, end, ptr;
                beg = A_ptr[k-m];
                end = A_ptr[k-m+1];
                for (ptr = beg; ptr < end; ptr++)
                    u[A_ind[ptr]] -= t * A_val[ptr];
            }
        }
        xassert(csa.valid);
        bfd_ftran(csa.bfd, u);
        /* update gamma[i] for other basic variables (except xB[p] and
         free variables) */
        pivot = tcol_vec[p];
        if (GLP_DEBUG){xassert(pivot != 0.0)}
        for (pos = 1; pos <= tcol_nnz; pos++)
        {   i = tcol_ind[pos];
            if (GLP_DEBUG){xassert(1 <= i && i <= m)}
            k = head[i];
            if (GLP_DEBUG){xassert(1 <= k && k <= m+n)}
            /* skip xB[p] */
            if (i == p) continue;
            /* skip free basic variable */
            if (type[head[i]] == GLP_FR)
            {
                if (GLP_DEBUG){xassert(gamma[i] == 1.0)}
                continue;
            }
            /* compute gamma[i] for the adjacent basis */
            t = tcol_vec[i] / pivot;
            t1 = gamma[i] + t * t * gamma_p + 2.0 * t * u[i];
            t2 = (refsp[k] ? 1.0 : 0.0) + eta_p * t * t;
            gamma[i] = (t1 >= t2 ? t1 : t2);
            /* (though gamma[i] can be exact zero, because the reference
             space does not include non-basic fixed variables) */
            if (gamma[i] < DBL_EPSILON) gamma[i] = DBL_EPSILON;
        }
        /* compute gamma[p] for the adjacent basis */
        if (type[head[m+q]] == GLP_FR)
            gamma[p] = 1.0;
        else
        {  gamma[p] = gamma_p / (pivot * pivot);
            if (gamma[p] < DBL_EPSILON) gamma[p] = DBL_EPSILON;
        }
        /* if xB[p], which becomes xN[q] in the adjacent basis, is fixed
         and belongs to the reference space, remove it from there, and
         change all gamma's appropriately */
        k = head[p];
        if (type[k] == GLP_FX && refsp[k])
        {  refsp[k] = 0;
            for (pos = 1; pos <= tcol_nnz; pos++)
            {  i = tcol_ind[pos];
                if (i == p)
                {  if (type[head[m+q]] == GLP_FR) continue;
                    t = 1.0 / tcol_vec[p];
                }
                else
                {  if (type[head[i]] == GLP_FR) continue;
                    t = tcol_vec[i] / tcol_vec[p];
                }
                gamma[i] -= t * t;
                if (gamma[i] < DBL_EPSILON) gamma[i] = DBL_EPSILON;
            }
        }
    }

    function err_in_bbar(csa){
        var m = csa.m;
        var bbar = csa.bbar;
        var i;
        var e, emax;
        var beta = new Array(1+m);
        eval_beta(csa, beta);
        emax = 0.0;
        for (i = 1; i <= m; i++)
        {  e = Math.abs(beta[i] - bbar[i]) / (1.0 + Math.abs(beta[i]));
            if (emax < e) emax = e;
        }
        return emax;
    }

    /***********************************************************************
     *  err_in_cbar - compute maximal relative error in dual solution
     *
     *  This routine returns maximal relative error:
     *
     *     max |cost[j] - cbar[j]| / (1 + |cost[j]|),
     *
     *  where cost and cbar are, respectively, directly computed and the
     *  current (updated) reduced costs of non-basic non-fixed variables.
     *
     *  NOTE: The routine is intended only for debugginig purposes. */

    function err_in_cbar(csa){
        var m = csa.m;
        var n = csa.n;
        var stat = csa.stat;
        var cbar = csa.cbar;
        var j;
        var e, emax, cost;
        var pi = new Array(1+m);
        eval_pi(csa, pi);
        emax = 0.0;
        for (j = 1; j <= n; j++)
        {  if (stat[j] == GLP_NS) continue;
            cost = eval_cost(csa, pi, j);
            e = Math.abs(cost - cbar[j]) / (1.0 + Math.abs(cost));
            if (emax < e) emax = e;
        }
        return emax;
    }

    function err_in_gamma(csa){
        var m = csa.m;
        var type = csa.type;
        var head = csa.head;
        var gamma = csa.gamma;
        var exact = csa.work4;
        var i;
        var e, emax, temp;
        eval_gamma(csa, exact);
        emax = 0.0;
        for (i = 1; i <= m; i++)
        {  if (type[head[i]] == GLP_FR)
        {  xassert(gamma[i] == 1.0);
            xassert(exact[i] == 1.0);
            continue;
        }
            temp = exact[i];
            e = Math.abs(temp - gamma[i]) / (1.0 + Math.abs(temp));
            if (emax < e) emax = e;
        }
        return emax;
    }

    function change_basis(csa){
        var m = csa.m;
        if (GLP_DEBUG){var n = csa.n}
        var type = csa.type;
        var head = csa.head;
        var bind = csa.bind;
        var stat = csa.stat;
        var p = csa.p;
        var delta = csa.delta;
        var q = csa.q;
        var k;
        /* xB[p] leaves the basis, xN[q] enters the basis */
        if (GLP_DEBUG){
            xassert(1 <= p && p <= m);
            xassert(1 <= q && q <= n);
        }
        /* xB[p] <. xN[q] */
        k = head[p]; head[p] = head[m+q]; head[m+q] = k;
        bind[head[p]] = p; bind[head[m+q]] = m + q;
        if (type[k] == GLP_FX)
            stat[q] = GLP_NS;
        else if (delta > 0.0)
        {
            if (GLP_DEBUG){
                xassert(type[k] == GLP_LO || type[k] == GLP_DB)
            }

            stat[q] = GLP_NL;
        }
        else /* delta < 0.0 */
        {
            if (GLP_DEBUG)
                xassert(type[k] == GLP_UP || type[k] == GLP_DB);
            stat[q] = GLP_NU;
        }
    }

    function check_feas(csa, tol_dj){
        var m = csa.m;
        var n = csa.n;
        var orig_type = csa.orig_type;
        var head = csa.head;
        var cbar = csa.cbar;
        var j, k;
        for (j = 1; j <= n; j++)
        {  k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG)
                xassert(1 <= k && k <= m+n);
            if (cbar[j] < - tol_dj)
                if (orig_type[k] == GLP_LO || orig_type[k] == GLP_FR)
                    return 1;
            if (cbar[j] > + tol_dj)
                if (orig_type[k] == GLP_UP || orig_type[k] == GLP_FR)
                    return 1;
        }
        return 0;
    }

    function set_aux_bnds(csa){
        var m = csa.m;
        var n = csa.n;
        var type = csa.type;
        var lb = csa.lb;
        var ub = csa.ub;
        var orig_type = csa.orig_type;
        var head = csa.head;
        var stat = csa.stat;
        var cbar = csa.cbar;
        var j, k;
        for (k = 1; k <= m+n; k++)
        {  switch (orig_type[k])
        {  case GLP_FR:
                /* to force free variables to enter the basis */
                type[k] = GLP_DB; lb[k] = -1e3; ub[k] = +1e3;
                break;
            case GLP_LO:
                type[k] = GLP_DB; lb[k] = 0.0; ub[k] = +1.0;
                break;
            case GLP_UP:
                type[k] = GLP_DB; lb[k] = -1.0; ub[k] = 0.0;
                break;
            case GLP_DB:
            case GLP_FX:
                type[k] = GLP_FX; lb[k] = ub[k] = 0.0;
                break;
            default:
                xassert(orig_type != orig_type);
        }
        }
        for (j = 1; j <= n; j++)
        {   k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG)
                xassert(1 <= k && k <= m+n);
            if (type[k] == GLP_FX)
                stat[j] = GLP_NS;
            else if (cbar[j] >= 0.0)
                stat[j] = GLP_NL;
            else
                stat[j] = GLP_NU;
        }
    }

    function set_orig_bnds(csa){
        var m = csa.m;
        var n = csa.n;
        var type = csa.type;
        var lb = csa.lb;
        var ub = csa.ub;
        var orig_type = csa.orig_type;
        var orig_lb = csa.orig_lb;
        var orig_ub = csa.orig_ub;
        var head = csa.head;
        var stat = csa.stat;
        var cbar = csa.cbar;
        var j, k;
        xcopyArr(type, 1, orig_type, 1, m+n);
        xcopyArr(lb, 1, orig_lb, 1, m+n);
        xcopyArr(ub, 1, orig_ub, 1, m+n);
        for (j = 1; j <= n; j++)
        {  k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG)
                xassert(1 <= k && k <= m+n);
            switch (type[k])
            {  case GLP_FR:
                stat[j] = GLP_NF;
                break;
                case GLP_LO:
                    stat[j] = GLP_NL;
                    break;
                case GLP_UP:
                    stat[j] = GLP_NU;
                    break;
                case GLP_DB:
                    if (cbar[j] >= +DBL_EPSILON)
                        stat[j] = GLP_NL;
                    else if (cbar[j] <= -DBL_EPSILON)
                        stat[j] = GLP_NU;
                    else if (Math.abs(lb[k]) <= Math.abs(ub[k]))
                        stat[j] = GLP_NL;
                    else
                        stat[j] = GLP_NU;
                    break;
                case GLP_FX:
                    stat[j] = GLP_NS;
                    break;
                default:
                    xassert(type != type);
            }
        }
    }

    function check_stab(csa, tol_dj){
        var n = csa.n;
        var stat = csa.stat;
        var cbar = csa.cbar;
        var j;
        for (j = 1; j <= n; j++)
        {  if (cbar[j] < - tol_dj)
            if (stat[j] == GLP_NL || stat[j] == GLP_NF) return 1;
            if (cbar[j] > + tol_dj)
                if (stat[j] == GLP_NU || stat[j] == GLP_NF) return 1;
        }
        return 0;
    }

    function eval_obj(csa){
        var m = csa.m;
        var n = csa.n;
        var obj = csa.obj;
        var head = csa.head;
        var bbar = csa.bbar;
        var i, j, k;
        var sum;
        sum = obj[0];
        /* walk through the list of basic variables */
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG)
                xassert(1 <= k && k <= m+n);
            if (k > m)
                sum += obj[k-m] * bbar[i];
        }
        /* walk through the list of non-basic variables */
        for (j = 1; j <= n; j++)
        {  k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG)
                xassert(1 <= k && k <= m+n);
            if (k > m)
                sum += obj[k-m] * get_xN(csa, j);
        }
        return sum;
    }

    function display(csa, parm, spec){
        var m = csa.m;
        var n = csa.n;
        var coef = csa.coef;
        var orig_type = csa.orig_type;
        var head = csa.head;
        var stat = csa.stat;
        var phase = csa.phase;
        var bbar = csa.bbar;
        var cbar = csa.cbar;
        var i, j, cnt;
        var sum;
        if (parm.msg_lev < GLP_MSG_ON) return;
        if (parm.out_dly > 0 &&
            1000.0 * xdifftime(xtime(), csa.tm_beg) < parm.out_dly)
            return;
        if (csa.it_cnt == csa.it_dpy) return;
        if (!spec && csa.it_cnt % parm.out_frq != 0) return;
        /* compute the sum of dual infeasibilities */
        sum = 0.0;
        if (phase == 1)
        {  for (i = 1; i <= m; i++)
            sum -= coef[head[i]] * bbar[i];
            for (j = 1; j <= n; j++)
                sum -= coef[head[m+j]] * get_xN(csa, j);
        }
        else
        {  for (j = 1; j <= n; j++)
        {  if (cbar[j] < 0.0)
            if (stat[j] == GLP_NL || stat[j] == GLP_NF)
                sum -= cbar[j];
            if (cbar[j] > 0.0)
                if (stat[j] == GLP_NU || stat[j] == GLP_NF)
                    sum += cbar[j];
        }
        }
        /* determine the number of basic fixed variables */
        cnt = 0;
        for (i = 1; i <= m; i++)
            if (orig_type[head[i]] == GLP_FX) cnt++;
        if (csa.phase == 1)
            xprintf(" " + csa.it_cnt + ":  infeas = " + sum + " (" + cnt + ")");
        else
            xprintf("|" + csa.it_cnt + ": obj = " + eval_obj(csa) + "  infeas = " + sum + " (" + cnt + ")");
        csa.it_dpy = csa.it_cnt;
    }

    function store_sol(csa, lp, p_stat, d_stat, ray){
        var m = csa.m;
        var n = csa.n;
        var zeta = csa.zeta;
        var head = csa.head;
        var stat = csa.stat;
        var bbar = csa.bbar;
        var cbar = csa.cbar;
        var i, j, k;
        var col, row;
        if (GLP_DEBUG){
            xassert(lp.m == m);
            xassert(lp.n == n);
            /* basis factorization */
            xassert(!lp.valid && lp.bfd == null);
            xassert(csa.valid && csa.bfd != null);
        }
        lp.valid = 1; csa.valid = 0;
        lp.bfd = csa.bfd; csa.bfd = null;
        xcopyArr(lp.head, 1, head, 1, m);
        /* basic solution status */
        lp.pbs_stat = p_stat;
        lp.dbs_stat = d_stat;
        /* objective function value */
        lp.obj_val = eval_obj(csa);
        /* simplex iteration count */
        lp.it_cnt = csa.it_cnt;
        /* unbounded ray */
        lp.some = ray;
        /* basic variables */
        for (i = 1; i <= m; i++)
        {  k = head[i]; /* x[k] = xB[i] */
            if (GLP_DEBUG)
                xassert(1 <= k && k <= m+n);
            if (k <= m)
            {   row = lp.row[k];
                row.stat = GLP_BS;
                row.bind = i;
                row.prim = bbar[i] / row.rii;
                row.dual = 0.0;
            }
            else
            {   col = lp.col[k-m];
                col.stat = GLP_BS;
                col.bind = i;
                col.prim = bbar[i] * col.sjj;
                col.dual = 0.0;
            }
        }
        /* non-basic variables */
        for (j = 1; j <= n; j++)
        {  k = head[m+j]; /* x[k] = xN[j] */
            if (GLP_DEBUG)
                xassert(1 <= k && k <= m+n);
            if (k <= m)
            {   row = lp.row[k];
                row.stat = stat[j];
                row.bind = 0;
                switch (stat[j])
                {  case GLP_NL:
                    row.prim = row.lb; break;
                    case GLP_NU:
                        row.prim = row.ub; break;
                    case GLP_NF:
                        row.prim = 0.0; break;
                    case GLP_NS:
                        row.prim = row.lb; break;
                    default:
                        xassert(stat != stat);
                }
                row.dual = (cbar[j] * row.rii) / zeta;
            }
            else
            {   col = lp.col[k-m];
                col.stat = stat[j];
                col.bind = 0;
                switch (stat[j])
                {  case GLP_NL:
                    col.prim = col.lb; break;
                    case GLP_NU:
                        col.prim = col.ub; break;
                    case GLP_NF:
                        col.prim = 0.0; break;
                    case GLP_NS:
                        col.prim = col.lb; break;
                    default:
                        xassert(stat != stat);
                }
                col.dual = (cbar[j] / col.sjj) / zeta;
            }
        }
    }

    var csa;
    var binv_st = 2;
    /* status of basis matrix factorization:
     0 - invalid; 1 - just computed; 2 - updated */
    var bbar_st = 0;
    /* status of primal values of basic variables:
     0 - invalid; 1 - just computed; 2 - updated */
    var cbar_st = 0;
    /* status of reduced costs of non-basic variables:
     0 - invalid; 1 - just computed; 2 - updated */
    var rigorous = 0;
    /* rigorous mode flag; this flag is used to enable iterative
     refinement on computing pivot rows and columns of the simplex
     table */
    var check = 0;
    var p_stat, d_stat, ret;
    /* allocate and initialize the common storage area */
    csa = alloc_csa(lp);
    init_csa(csa, lp);
    if (parm.msg_lev >= GLP_MSG_DBG)
        xprintf("Objective scale factor = " + csa.zeta + "");

    while (true){
        /* main loop starts here */
        /* compute factorization of the basis matrix */
        if (binv_st == 0)
        {  ret = invert_B(csa);
            if (ret != 0)
            {  if (parm.msg_lev >= GLP_MSG_ERR)
            {  xprintf("Error: unable to factorize the basis matrix (" + ret + ")");
                xprintf("Sorry, basis recovery procedure not implemented yet");
            }
                xassert(!lp.valid && lp.bfd == null);
                lp.bfd = csa.bfd; csa.bfd = null;
                lp.pbs_stat = lp.dbs_stat = GLP_UNDEF;
                lp.obj_val = 0.0;
                lp.it_cnt = csa.it_cnt;
                lp.some = 0;
                ret = GLP_EFAIL;
                return ret;
            }
            csa.valid = 1;
            binv_st = 1; /* just computed */
            /* invalidate basic solution components */
            bbar_st = cbar_st = 0;
        }
        /* compute reduced costs of non-basic variables */
        if (cbar_st == 0)
        {  eval_cbar(csa);
            cbar_st = 1; /* just computed */
            /* determine the search phase, if not determined yet */
            if (csa.phase == 0)
            {  if (check_feas(csa, 0.90 * parm.tol_dj) != 0)
            {  /* current basic solution is dual infeasible */
                /* start searching for dual feasible solution */
                csa.phase = 1;
                set_aux_bnds(csa);
            }
            else
            {  /* current basic solution is dual feasible */
                /* start searching for optimal solution */
                csa.phase = 2;
                set_orig_bnds(csa);
            }
                xassert(check_stab(csa, parm.tol_dj) == 0);
                /* some non-basic double-bounded variables might become
                 fixed (on phase I) or vice versa (on phase II) */
                csa.refct = 0;
                /* bounds of non-basic variables have been changed, so
                 invalidate primal values */
                bbar_st = 0;
            }
            /* make sure that the current basic solution remains dual
             feasible */
            if (check_stab(csa, parm.tol_dj) != 0)
            {  if (parm.msg_lev >= GLP_MSG_ERR)
                xprintf("Warning: numerical instability (dual simplex, phase " + (csa.phase == 1 ? "I" : "II") + ")");
                if (parm.meth == GLP_DUALP)
                {  store_sol(csa, lp, GLP_UNDEF, GLP_UNDEF, 0);
                    ret = GLP_EFAIL;
                    return ret;
                }
                /* restart the search */
                csa.phase = 0;
                binv_st = 0;
                rigorous = 5;
                continue;
            }
        }
        xassert(csa.phase == 1 || csa.phase == 2);
        /* on phase I we do not need to wait until the current basic
         solution becomes primal feasible; it is sufficient to make
         sure that all reduced costs have correct signs */
        if (csa.phase == 1 && check_feas(csa, parm.tol_dj) == 0)
        {  /* the current basis is dual feasible; switch to phase II */
            display(csa, parm, 1);
            csa.phase = 2;
            if (cbar_st != 1)
            {  eval_cbar(csa);
                cbar_st = 1;
            }
            set_orig_bnds(csa);
            csa.refct = 0;
            bbar_st = 0;
        }
        /* compute primal values of basic variables */
        if (bbar_st == 0)
        {  eval_bbar(csa);
            if (csa.phase == 2)
                csa.bbar[0] = eval_obj(csa);
            bbar_st = 1; /* just computed */
        }
        /* redefine the reference space, if required */
        switch (parm.pricing)
        {  case GLP_PT_STD:
            break;
            case GLP_PT_PSE:
                if (csa.refct == 0) reset_refsp(csa);
                break;
            default:
                xassert(parm != parm);
        }
        /* at this point the basis factorization and all basic solution
         components are valid */
        xassert(binv_st && bbar_st && cbar_st);
        /* check accuracy of current basic solution components (only for
         debugging) */
        if (check)
        {  var e_bbar = err_in_bbar(csa);
            var e_cbar = err_in_cbar(csa);
            var e_gamma =
                (parm.pricing == GLP_PT_PSE ? err_in_gamma(csa) : 0.0);
            xprintf("e_bbar = " + e_bbar + "; e_cbar = " + e_cbar + "; e_gamma = " + e_gamma + "");
            xassert(e_bbar <= 1e-5 && e_cbar <= 1e-5 && e_gamma <= 1e-3);
        }
        /* if the objective has to be maximized, check if it has reached
         its lower limit */
        if (csa.phase == 2 && csa.zeta < 0.0 &&
            parm.obj_ll > -DBL_MAX && csa.bbar[0] <= parm.obj_ll)
        {  if (bbar_st != 1 || cbar_st != 1)
        {  if (bbar_st != 1) bbar_st = 0;
            if (cbar_st != 1) cbar_st = 0;
            continue;
        }
            display(csa, parm, 1);
            if (parm.msg_lev >= GLP_MSG_ALL)
                xprintf("OBJECTIVE LOWER LIMIT REACHED; SEARCH TERMINATED"
                );
            store_sol(csa, lp, GLP_INFEAS, GLP_FEAS, 0);
            ret = GLP_EOBJLL;
            return ret;
        }
        /* if the objective has to be minimized, check if it has reached
         its upper limit */
        if (csa.phase == 2 && csa.zeta > 0.0 &&
            parm.obj_ul < +DBL_MAX && csa.bbar[0] >= parm.obj_ul)
        {  if (bbar_st != 1 || cbar_st != 1)
        {  if (bbar_st != 1) bbar_st = 0;
            if (cbar_st != 1) cbar_st = 0;
            continue;
        }
            display(csa, parm, 1);
            if (parm.msg_lev >= GLP_MSG_ALL)
                xprintf("OBJECTIVE UPPER LIMIT REACHED; SEARCH TERMINATED"
                );
            store_sol(csa, lp, GLP_INFEAS, GLP_FEAS, 0);
            ret = GLP_EOBJUL;
            return ret;
        }
        /* check if the iteration limit has been exhausted */
        if (parm.it_lim < INT_MAX &&
            csa.it_cnt - csa.it_beg >= parm.it_lim)
        {  if (csa.phase == 2 && bbar_st != 1 || cbar_st != 1)
        {  if (csa.phase == 2 && bbar_st != 1) bbar_st = 0;
            if (cbar_st != 1) cbar_st = 0;
            continue;
        }
            display(csa, parm, 1);
            if (parm.msg_lev >= GLP_MSG_ALL)
                xprintf("ITERATION LIMIT EXCEEDED; SEARCH TERMINATED");
            switch (csa.phase)
            {  case 1:
                d_stat = GLP_INFEAS;
                set_orig_bnds(csa);
                eval_bbar(csa);
                break;
                case 2:
                    d_stat = GLP_FEAS;
                    break;
                default:
                    xassert(csa != csa);
            }
            store_sol(csa, lp, GLP_INFEAS, d_stat, 0);
            ret = GLP_EITLIM;
            return ret;
        }
        /* check if the time limit has been exhausted */
        if (parm.tm_lim < INT_MAX &&
            1000.0 * xdifftime(xtime(), csa.tm_beg) >= parm.tm_lim)
        {  if (csa.phase == 2 && bbar_st != 1 || cbar_st != 1)
        {  if (csa.phase == 2 && bbar_st != 1) bbar_st = 0;
            if (cbar_st != 1) cbar_st = 0;
            continue;
        }
            display(csa, parm, 1);
            if (parm.msg_lev >= GLP_MSG_ALL)
                xprintf("TIME LIMIT EXCEEDED; SEARCH TERMINATED");
            switch (csa.phase)
            {  case 1:
                d_stat = GLP_INFEAS;
                set_orig_bnds(csa);
                eval_bbar(csa);
                break;
                case 2:
                    d_stat = GLP_FEAS;
                    break;
                default:
                    xassert(csa != csa);
            }
            store_sol(csa, lp, GLP_INFEAS, d_stat, 0);
            ret = GLP_ETMLIM;
            return ret;
        }
        /* display the search progress */
        display(csa, parm, 0);
        /* choose basic variable xB[p] */
        chuzr(csa, parm.tol_bnd);
        if (csa.p == 0)
        {  if (bbar_st != 1 || cbar_st != 1)
        {  if (bbar_st != 1) bbar_st = 0;
            if (cbar_st != 1) cbar_st = 0;
            continue;
        }
            display(csa, parm, 1);
            switch (csa.phase)
            {  case 1:
                if (parm.msg_lev >= GLP_MSG_ALL)
                    xprintf("PROBLEM HAS NO DUAL FEASIBLE SOLUTION");
                set_orig_bnds(csa);
                eval_bbar(csa);
                p_stat = GLP_INFEAS; d_stat = GLP_NOFEAS;
                break;
                case 2:
                    if (parm.msg_lev >= GLP_MSG_ALL)
                        xprintf("OPTIMAL SOLUTION FOUND");
                    p_stat = d_stat = GLP_FEAS;
                    break;
                default:
                    xassert(csa != csa);
            }
            store_sol(csa, lp, p_stat, d_stat, 0);
            ret = 0;
            return ret;
        }
        /* compute pivot row of the simplex table */
        {  var rho = csa.work4;
            eval_rho(csa, rho);
            if (rigorous) refine_rho(csa, rho);
            eval_trow(csa, rho);
            sort_trow(csa, parm.tol_bnd);
        }
        /* choose non-basic variable xN[q] */
        switch (parm.r_test)
        {  case GLP_RT_STD:
            chuzc(csa, 0.0);
            break;
            case GLP_RT_HAR:
                chuzc(csa, 0.30 * parm.tol_dj);
                break;
            default:
                xassert(parm != parm);
        }
        if (csa.q == 0)
        {  if (bbar_st != 1 || cbar_st != 1 || !rigorous)
        {  if (bbar_st != 1) bbar_st = 0;
            if (cbar_st != 1) cbar_st = 0;
            rigorous = 1;
            continue;
        }
            display(csa, parm, 1);
            switch (csa.phase)
            {  case 1:
                if (parm.msg_lev >= GLP_MSG_ERR)
                    xprintf("Error: unable to choose basic variable on phase I");
                xassert(!lp.valid && lp.bfd == null);
                lp.bfd = csa.bfd; csa.bfd = null;
                lp.pbs_stat = lp.dbs_stat = GLP_UNDEF;
                lp.obj_val = 0.0;
                lp.it_cnt = csa.it_cnt;
                lp.some = 0;
                ret = GLP_EFAIL;
                break;
                case 2:
                    if (parm.msg_lev >= GLP_MSG_ALL)
                        xprintf("PROBLEM HAS NO FEASIBLE SOLUTION");
                    store_sol(csa, lp, GLP_NOFEAS, GLP_FEAS,
                        csa.head[csa.p]);
                    ret = 0;
                    break;
                default:
                    xassert(csa != csa);
            }
            return ret;
        }
        /* check if the pivot element is acceptable */
        {  var piv = csa.trow_vec[csa.q];
            var eps = 1e-5 * (1.0 + 0.01 * csa.trow_max);
            if (Math.abs(piv) < eps)
            {  if (parm.msg_lev >= GLP_MSG_DBG)
                xprintf("piv = " + piv + "; eps = " + eps + "");
                if (!rigorous)
                {  rigorous = 5;
                    continue;
                }
            }
        }
        /* now xN[q] and xB[p] have been chosen anyhow */
        /* compute pivot column of the simplex table */
        eval_tcol(csa);
        if (rigorous) refine_tcol(csa);
        /* accuracy check based on the pivot element */
        {  var piv1 = csa.tcol_vec[csa.p]; /* more accurate */
            var piv2 = csa.trow_vec[csa.q]; /* less accurate */
            xassert(piv1 != 0.0);
            if (Math.abs(piv1 - piv2) > 1e-8 * (1.0 + Math.abs(piv1)) ||
                !(piv1 > 0.0 && piv2 > 0.0 || piv1 < 0.0 && piv2 < 0.0))
            {  if (parm.msg_lev >= GLP_MSG_DBG)
                xprintf("piv1 = " + piv1 + "; piv2 = " + piv2 + "");
                if (binv_st != 1 || !rigorous)
                {  if (binv_st != 1) binv_st = 0;
                    rigorous = 5;
                    continue;
                }
                /* (not a good idea; should be revised later) */
                if (csa.tcol_vec[csa.p] == 0.0)
                {  csa.tcol_nnz++;
                    xassert(csa.tcol_nnz <= csa.m);
                    csa.tcol_ind[csa.tcol_nnz] = csa.p;
                }
                csa.tcol_vec[csa.p] = piv2;
            }
        }
        /* update primal values of basic variables */
        update_bbar(csa);
        if (csa.phase == 2)
            csa.bbar[0] += (csa.cbar[csa.q] / csa.zeta) *
                (csa.delta / csa.tcol_vec[csa.p]);
        bbar_st = 2; /* updated */
        /* update reduced costs of non-basic variables */
        update_cbar(csa);
        cbar_st = 2; /* updated */
        /* update steepest edge coefficients */
        switch (parm.pricing)
        {  case GLP_PT_STD:
            break;
            case GLP_PT_PSE:
                if (csa.refct > 0) update_gamma(csa);
                break;
            default:
                xassert(parm != parm);
        }
        /* update factorization of the basis matrix */
        ret = update_B(csa, csa.p, csa.head[csa.m+csa.q]);
        if (ret == 0)
            binv_st = 2; /* updated */
        else
        {  csa.valid = 0;
            binv_st = 0; /* invalid */
        }
        /* change the basis header */
        change_basis(csa);
        /* iteration complete */
        csa.it_cnt++;
        if (rigorous > 0) rigorous--;
    }
}

}(typeof exports === 'object' && exports || this));
