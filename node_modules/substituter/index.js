const _ = require('lodash')

module.exports = function (tmpl, data) {
  function substitute (p) {
    const r = p.replace(/\$\{([\w.-]+)}/g, function (match, term) {
      return _.get(data, term) || match
    })

    if (_.startsWith(r, '/') && _.endsWith(r, '/')) {
      return new RegExp(_.trim(r, '/'))
    }

    return r
  }

  function transform (obj) {
    if (obj === undefined || obj === null) return obj
    if (_.isBuffer(obj)) return substitute(obj.toString())
    if (_.isString(obj)) return substitute(obj)
    if (_.isArray(obj)) return _.map(obj, transform)
    if (_.isPlainObject(obj)) return _.mapValues(obj, transform)
    return obj
  }

  return transform(tmpl)
}
