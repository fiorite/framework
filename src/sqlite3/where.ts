import { DbValue, DbWhere } from '../db';

export function buildSqlite3Where(iterable: Iterable<DbWhere>): {
  sql: string,
  params: Record<string, unknown>
} {
  let counter = 0;
  const pieces: string[] = [];
  const params: Record<string, unknown> = {};
  // let startConditionSkipped = false;

  for (const where of iterable) {
    // if (!startConditionSkipped) {
    //   startConditionSkipped = true;
    // } else {
    //   pieces.push(where.condition === DbWhereCondition.And ? 'AND' : 'OR');
    // }

    const column = String(where.key);
    let operator: string;
    let iterable = false;
    switch (where.operator) {
      case '==':
        operator = '=';
        break;
      case '!=':
        operator = '<>';
        break;
      case '>':
      case '>=':
      case '<':
      case '<=':
        operator = where.operator;
        break;
      case 'in':
        operator = 'IN';
        iterable = true;
        break;
      case 'not-in':
        operator = 'NOT IN';
        iterable = true;
        break;
      default:
        throw new Error('unknown operator:' + where.operator);
    }
    if (iterable) {
      const countValue = counter++;
      const pkeys = (where.value as unknown as DbValue[]).map((value, index) => {
        const param = `$w${countValue}_${column}_${index}`;
        params[param] = value;
        return param;
      });

      pieces.push(`${column} ${operator} (${pkeys.join(', ')})`);
    } else {
      const param = `$w${counter++}_${column}`;
      pieces.push(`${column} ${operator} ${param}`);
      params[param] = where.value;
    }
  }

  return { sql: pieces.join(' AND '), params };
}
