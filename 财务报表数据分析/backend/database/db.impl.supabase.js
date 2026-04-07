/**
 * Supabase 数据库连接模块
 * V2.7 新增 - 替代 SQLite 实现相同的 API
 */

import supabase, { initStorageBuckets, checkConnection } from '../src/config/supabase.js'

let initialized = false

/**
 * 获取数据库连接 (兼容原 SQLite API)
 * Supabase 是无状态的，不需要持久连接
 */
export async function getDatabase() {
  if (!supabase) {
    throw new Error('Supabase 未配置，请设置环境变量 SUPABASE_URL 和 SUPABASE_ANON_KEY')
  }
  return supabase
}

/**
 * 初始化数据库表结构
 * 注意: Supabase 的表结构需要通过 Supabase Dashboard 或 migration 创建
 * 这里只做连接检查和存储桶初始化
 */
export async function initDatabase() {
  if (initialized) {
    console.log('✅ 数据库已初始化')
    return
  }

  try {
    // 检查连接
    const { connected, message } = await checkConnection()
    if (!connected) {
      console.warn('⚠️ Supabase 连接检查:', message)
    } else {
      console.log('✅ Supabase 连接成功')
    }

    // 初始化存储桶
    await initStorageBuckets()

    initialized = true
    console.log('✅ Supabase 数据库初始化完成')
  } catch (err) {
    console.error('❌ Supabase 数据库初始化失败:', err)
    throw err
  }
}

/**
 * 关闭数据库连接 (兼容原 API，Supabase 无需关闭)
 */
export function closeDatabase() {
  initialized = false
  console.log('✅ Supabase 连接已释放')
}

/**
 * 执行查询 (返回多行)
 * @param {string} sql - SQL 查询
 * @param {Array} params - 参数
 * @returns {Promise<Array>}
 */
export async function query(sql, params = []) {
  if (!supabase) {
    throw new Error('Supabase 未配置')
  }

  try {
    // 解析 SQL 获取表名和操作
    const { table, operation, fields, where, orderBy, limit, offset } = parseSelectSQL(sql, params)

    let queryBuilder = supabase.from(table).select(fields || '*')

    // 应用 WHERE 条件
    if (where) {
      queryBuilder = applyWhereConditions(queryBuilder, where.conditions, where.params, params)
    }

    // 应用排序
    if (orderBy) {
      queryBuilder = queryBuilder.order(orderBy.column, { ascending: orderBy.ascending })
    }

    // 应用分页
    if (limit) {
      queryBuilder = queryBuilder.limit(limit)
    }
    if (offset) {
      queryBuilder = queryBuilder.range(offset, offset + (limit || 1000) - 1)
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error('❌ 查询失败:', error.message)
      throw new Error(error.message)
    }

    return data || []
  } catch (err) {
    console.error('❌ 查询失败:', err.message)
    throw err
  }
}

/**
 * 执行查询 (返回单行)
 * @param {string} sql - SQL 查询
 * @param {Array} params - 参数
 * @returns {Promise<Object|null>}
 */
export async function queryOne(sql, params = []) {
  const results = await query(sql + ' LIMIT 1', params)
  return results.length > 0 ? results[0] : null
}

/**
 * 执行插入/更新/删除
 * @param {string} sql - SQL 语句
 * @param {Array} params - 参数
 * @returns {Promise<{id: number, changes: number}>}
 */
export async function run(sql, params = []) {
  if (!supabase) {
    throw new Error('Supabase 未配置')
  }

  try {
    const { operation, table, data, where } = parseModifySQL(sql, params)

    if (operation === 'INSERT') {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()

      if (error) {
        console.error('❌ 插入失败:', error.message)
        throw new Error(error.message)
      }

      return {
        id: result?.[0]?.id || 0,
        changes: result?.length || 0
      }
    } else if (operation === 'UPDATE') {
      let queryBuilder = supabase.from(table).update(data)

      // 应用 WHERE 条件
      if (where) {
        queryBuilder = applyWhereConditionsToModify(queryBuilder, where.conditions, where.params, params)
      }

      const { data: result, error } = await queryBuilder.select()

      if (error) {
        console.error('❌ 更新失败:', error.message)
        throw new Error(error.message)
      }

      return {
        id: result?.[0]?.id || 0,
        changes: result?.length || 0
      }
    } else if (operation === 'DELETE') {
      let queryBuilder = supabase.from(table).delete()

      // 应用 WHERE 条件
      if (where) {
        queryBuilder = applyWhereConditionsToModify(queryBuilder, where.conditions, where.params, params)
      }

      const { data: result, error } = await queryBuilder.select()

      if (error) {
        console.error('❌ 删除失败:', error.message)
        throw new Error(error.message)
      }

      return {
        id: 0,
        changes: result?.length || 0
      }
    }

    throw new Error(`不支持的操作: ${operation}`)
  } catch (err) {
    console.error('❌ 执行失败:', err.message)
    throw err
  }
}

/**
 * 执行事务 (Supabase 不支持传统事务，使用原子操作)
 * @param {Function} callback - 回调函数
 */
export async function transaction(callback) {
  // Supabase 不支持传统事务
  // 对于简单操作，直接执行回调
  // 对于复杂事务，需要在业务层处理或使用 PostgreSQL 函数
  try {
    const result = await callback({ query, queryOne, run })
    return result
  } catch (err) {
    throw err
  }
}

// ============ SQL 解析辅助函数 ============

/**
 * 解析 SELECT SQL
 */
function parseSelectSQL(sql, params) {
  const result = {
    table: null,
    operation: 'SELECT',
    fields: '*',
    where: null,
    orderBy: null,
    limit: null,
    offset: null
  }

  // 提取表名
  const fromMatch = sql.match(/FROM\s+(\w+)/i)
  if (fromMatch) {
    result.table = fromMatch[1]
  }

  // 提取字段
  const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i)
  if (selectMatch && selectMatch[1] !== '*') {
    result.fields = selectMatch[1].split(',').map(f => f.trim()).join(',')
  }

  // 提取 WHERE 条件
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s+OFFSET|$)/i)
  if (whereMatch) {
    result.where = {
      conditions: whereMatch[1],
      params: params
    }
  }

  // 提取 ORDER BY
  const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i)
  if (orderMatch) {
    result.orderBy = {
      column: orderMatch[1],
      ascending: (orderMatch[2] || 'ASC').toUpperCase() !== 'DESC'
    }
  }

  // 提取 LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
  if (limitMatch) {
    result.limit = parseInt(limitMatch[1])
  }

  // 提取 OFFSET
  const offsetMatch = sql.match(/OFFSET\s+(\d+)/i)
  if (offsetMatch) {
    result.offset = parseInt(offsetMatch[1])
  }

  return result
}

/**
 * 解析 INSERT/UPDATE/DELETE SQL
 */
function parseModifySQL(sql, params) {
  const result = {
    operation: null,
    table: null,
    data: {},
    where: null
  }

  // 检测操作类型
  if (sql.trim().toUpperCase().startsWith('INSERT')) {
    result.operation = 'INSERT'

    // 提取表名
    const intoMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i)
    if (intoMatch) {
      result.table = intoMatch[1]
    }

    // 提取字段和值
    const fieldsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i)
    if (fieldsMatch) {
      const fields = fieldsMatch[1].split(',').map(f => f.trim())
      fields.forEach((field, index) => {
        if (params[index] !== undefined) {
          result.data[field] = params[index]
        }
      })
    }
  } else if (sql.trim().toUpperCase().startsWith('UPDATE')) {
    result.operation = 'UPDATE'

    // 提取表名
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i)
    if (tableMatch) {
      result.table = tableMatch[1]
    }

    // 提取 SET 字段
    const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i)
    if (setMatch) {
      const setClause = setMatch[1]
      const assignments = setClause.split(',').map(a => a.trim())
      let paramIndex = 0

      assignments.forEach(assignment => {
        const fieldMatch = assignment.match(/(\w+)\s*=\s*\?/)
        if (fieldMatch && params[paramIndex] !== undefined) {
          result.data[fieldMatch[1]] = params[paramIndex]
          paramIndex++
        }
      })

      // 计算 WHERE 参数的起始索引
      const whereIndex = assignments.length
      const whereMatch = sql.match(/WHERE\s+(.+)$/i)
      if (whereMatch) {
        result.where = {
          conditions: whereMatch[1],
          params: params.slice(whereIndex)
        }
      }
    }
  } else if (sql.trim().toUpperCase().startsWith('DELETE')) {
    result.operation = 'DELETE'

    // 提取表名
    const fromMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i)
    if (fromMatch) {
      result.table = fromMatch[1]
    }

    // 提取 WHERE
    const whereMatch = sql.match(/WHERE\s+(.+)$/i)
    if (whereMatch) {
      result.where = {
        conditions: whereMatch[1],
        params: params
      }
    }
  }

  return result
}

/**
 * 应用 WHERE 条件到查询
 */
function applyWhereConditions(queryBuilder, conditions, whereParams, allParams) {
  // 简单的条件解析
  // 支持: field = ?, field LIKE ?, field >= ?, field <= ?, field > ?, field < ?, field != ?
  const conditionRegex = /(\w+)\s*(=|!=|<>|>=|<=|>|<|LIKE|ILIKE)\s*\?/gi
  let match
  let paramIndex = 0

  while ((match = conditionRegex.exec(conditions)) !== null) {
    const field = match[1]
    const operator = match[2].toUpperCase()
    const value = whereParams[paramIndex] || allParams[paramIndex]

    switch (operator) {
      case '=':
        queryBuilder = queryBuilder.eq(field, value)
        break
      case '!=':
      case '<>':
        queryBuilder = queryBuilder.neq(field, value)
        break
      case '>':
        queryBuilder = queryBuilder.gt(field, value)
        break
      case '>=':
        queryBuilder = queryBuilder.gte(field, value)
        break
      case '<':
        queryBuilder = queryBuilder.lt(field, value)
        break
      case '<=':
        queryBuilder = queryBuilder.lte(field, value)
        break
      case 'LIKE':
        queryBuilder = queryBuilder.like(field, value)
        break
      case 'ILIKE':
        queryBuilder = queryBuilder.ilike(field, value)
        break
    }
    paramIndex++
  }

  return queryBuilder
}

/**
 * 应用 WHERE 条件到修改操作
 */
function applyWhereConditionsToModify(queryBuilder, conditions, whereParams, allParams) {
  // 简化版本：只支持单条件 id = ?
  const idMatch = conditions.match(/id\s*=\s*\?/i)
  if (idMatch) {
    const id = whereParams[0] || allParams[0]
    return queryBuilder.eq('id', id)
  }

  // 支持多条件
  return applyWhereConditions(queryBuilder, conditions, whereParams, allParams)
}

export default {
  getDatabase,
  initDatabase,
  closeDatabase,
  query,
  queryOne,
  run,
  transaction
}
