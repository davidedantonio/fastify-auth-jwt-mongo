'use strict'

const fp = require('fastify-plugin')
const Mongo = require('fastify-mongodb')
const JWT = require('fastify-jwt')
const routes = require('./routes')

module.exports = fp(async (app, opts) => {
  if (!app.mongo) {
    app.register(Mongo, opts.mongo || opts.mongodb)
  }

  app.register(JWT, Object.assign(
    {},
    { secret: process.env.JWT_SECRET },
    opts.jwt
  ))

  app.register(routes, {
    prefix: opts.prefix
  })
})
