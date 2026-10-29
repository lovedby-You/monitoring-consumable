// Prisma tiruan di memori — hanya mendukung operasi yang dipakai aplikasi. Untuk menguji lapisan API/service
// tanpa database. (Migrasi SQL diuji terpisah terhadap MariaDB/MySQL sungguhan.)
const t = (v) => (v instanceof Date ? v.getTime() : v);

function match(row, where = {}) {
  return Object.entries(where).every(([k, v]) => {
    if (k === 'OR') return v.some((w) => match(row, w));
    if (k === 'AND') return v.every((w) => match(row, w));
    const x = row[k];
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      return Object.entries(v).every(([op, val]) => {
        if (op === 'gte') return t(x) >= t(val);
        if (op === 'lte') return t(x) <= t(val);
        if (op === 'gt') return t(x) > t(val);
        if (op === 'lt') return t(x) < t(val);
        if (op === 'in') return val.map(t).includes(t(x));
        if (op === 'contains')
          return String(x ?? '')
            .toLowerCase()
            .includes(String(val).toLowerCase());
        throw new Error(`fake-prisma: operator ${op} belum didukung`);
      });
    }
    return t(x) === t(v);
  });
}

function sorter(orderBy) {
  const list = [].concat(orderBy || []);
  return (a, b) => {
    for (const o of list) {
      const [k, dir] = Object.entries(o)[0];
      const d = t(a[k]) < t(b[k]) ? -1 : t(a[k]) > t(b[k]) ? 1 : 0;
      if (d) return dir === 'desc' ? -d : d;
    }
    return 0;
  };
}

const pick = (row, select) =>
  select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : row;

function makeFakePrisma() {
  const tables = { user: [], consumable: [], stockIn: [], stockOut: [], dailyOrder: [] };
  const seq = Object.fromEntries(Object.keys(tables).map((k) => [k, 1]));
  const unique = { user: ['username'], consumable: ['code'], dailyOrder: ['date'] };
  const defaults = {
    user: { role: 'USER', isActive: true },
    consumable: { initialStock: 0, unitCost: 0, isActive: true },
    stockIn: { poNumber: null, createdById: null },
    stockOut: { createdById: null },
    dailyOrder: {},
  };
  const dup = () => Object.assign(new Error('Unique constraint'), { code: 'P2002' });

  const withInclude = (name, row, include) => {
    const out = { ...row };
    if (include?.consumable)
      out.consumable = pick(
        tables.consumable.find((c) => c.id === row.consumableId),
        include.consumable.select,
      );
    if (include?.createdBy)
      out.createdBy = row.createdById
        ? pick(
            tables.user.find((u) => u.id === row.createdById),
            include.createdBy.select,
          )
        : null;
    return out;
  };

  const model = (name) => ({
    findMany: async ({ where, include, orderBy, skip = 0, take } = {}) =>
      tables[name]
        .filter((r) => match(r, where))
        .sort(sorter(orderBy))
        .slice(skip, take ? skip + take : undefined)
        .map((r) => withInclude(name, r, include)),
    findUnique: async ({ where }) => tables[name].find((r) => match(r, where)) || null,
    count: async ({ where } = {}) => tables[name].filter((r) => match(r, where)).length,
    create: async ({ data, include }) => {
      for (const f of unique[name] || [])
        if (tables[name].some((r) => t(r[f]) === t(data[f]))) throw dup();
      const now = new Date();
      const row = { id: seq[name]++, createdAt: now, updatedAt: now, ...defaults[name], ...data };
      tables[name].push(row);
      return withInclude(name, row, include);
    },
    update: async ({ where, data }) => {
      const row = tables[name].find((r) => match(r, where));
      if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' });
      for (const f of unique[name] || [])
        if (data[f] !== undefined && tables[name].some((r) => r !== row && t(r[f]) === t(data[f])))
          throw dup();
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
    delete: async ({ where }) => {
      const i = tables[name].findIndex((r) => match(r, where));
      if (i < 0) throw Object.assign(new Error('not found'), { code: 'P2025' });
      if (name === 'consumable') {
        const id = tables[name][i].id;
        if ([...tables.stockIn, ...tables.stockOut].some((r) => r.consumableId === id))
          throw Object.assign(new Error('fk'), { code: 'P2003' });
      }
      return tables[name].splice(i, 1)[0];
    },
    upsert: async ({ where, create, update }) => {
      const row = tables[name].find((r) => match(r, where));
      return row ? api[name].update({ where, data: update }) : api[name].create({ data: create });
    },
    groupBy: async ({ by, where, _sum }) => {
      const groups = new Map();
      for (const r of tables[name].filter((x) => match(x, where))) {
        const key = by.map((k) => t(r[k])).join('|');
        const g = groups.get(key) || {
          ...Object.fromEntries(by.map((k) => [k, r[k]])),
          _sum: Object.fromEntries(Object.keys(_sum).map((f) => [f, 0])),
        };
        for (const f of Object.keys(_sum)) g._sum[f] += r[f];
        groups.set(key, g);
      }
      return [...groups.values()];
    },
    aggregate: async ({ where, _sum }) => {
      const rows = tables[name].filter((x) => match(x, where));
      return {
        _sum: Object.fromEntries(
          Object.keys(_sum).map((f) => [
            f,
            rows.length ? rows.reduce((a, r) => a + r[f], 0) : null,
          ]),
        ),
      };
    },
  });

  const api = Object.fromEntries(Object.keys(tables).map((n) => [n, model(n)]));
  api.$queryRaw = async (_strings, id) => {
    const c = tables.consumable.find((x) => x.id === id);
    return c ? [{ id: c.id, initialStock: c.initialStock }] : [];
  };
  api.__txOptions = [];
  api.$transaction = async (arg, options) => {
    api.__txOptions.push(options);
    return typeof arg === 'function' ? arg(api) : Promise.all(arg);
  };
  api.$disconnect = async () => {};
  api.__tables = tables;
  return api;
}

module.exports = { makeFakePrisma };
