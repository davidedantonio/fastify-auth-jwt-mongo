'use strict'

const {
  test,
  beforeEach,
  tearDown
} = require('tap')

const clean = require('mongo-clean')
const { MongoClient } = require('mongodb')
const Fastify = require('fastify')
const AuthMongoJwt = require('.')

const url = 'mongodb://localhost:27017'
const database = 'tests'

let client

beforeEach(async function () {
  if (!client) {
    client = await MongoClient.connect(url, {
      w: 1,
      useNewUrlParser: true
    })
  }
  await clean(client.db(database))
})

tearDown(async function () {
  if (client) {
    await client.close()
    client = null
  }
})

// needed for testing your plugins
function config () {
  return {
    jwt: {
      secret: 'thisisalongsecretjustfortests'
    },
    mongodb: {
      client,
      database
    }
  }
}

// automatically build and tear down our instance
function build (t) {
  const app = Fastify({
    logger: {
      level: 'error'
    }
  })

  // we use fastify-plugin so that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  app.register(AuthMongoJwt, config())

  // tear down our app after we are done
  t.tearDown(app.close.bind(app))

  return app
}

test('signup and login', async (t) => {
  const app = build(t)

  const res1 = await app.inject({
    url: '/signup',
    method: 'POST',
    body: {
      fullName: 'davide d\'antonio',
      username: 'davide',
      password: 'davide'
    }
  })

  t.deepEqual(res1.statusCode, 200)

  const res2 = await app.inject({
    url: '/signin',
    method: 'POST',
    body: {
      username: 'davide',
      password: 'davide'
    }
  })

  t.deepEqual(res2.statusCode, 200)
})

test('signup without password', async (t) => {
  const app = build(t)

  const res1 = await app.inject({
    url: '/signup',
    method: 'POST',
    body: {
      fullName: 'davide',
      username: 'davide'
    }
  })

  t.deepEqual(res1.statusCode, 400)
  t.match(JSON.parse(res1.body), {
    statusCode: 400,
    error: 'Bad Request',
    message: 'body should have required property \'password\''
  })
})

test('signup without username', async (t) => {
  const app = build(t)

  const res1 = await app.inject({
    url: '/signup',
    method: 'POST',
    body: {
      fullName: 'dddddd',
      password: 'aaaaa'
    }
  })

  t.deepEqual(res1.statusCode, 400)
  t.match(JSON.parse(res1.body), {
    statusCode: 400,
    error: 'Bad Request',
    message: 'body should have required property \'username\''
  })
})

test('signup without fullName', async (t) => {
  const app = build(t)

  const res1 = await app.inject({
    url: '/signup',
    method: 'POST',
    body: {
      username: 'dddddd',
      password: 'aaaaa'
    }
  })

  t.deepEqual(res1.statusCode, 400)
  t.match(JSON.parse(res1.body), {
    statusCode: 400,
    error: 'Bad Request',
    message: 'body should have required property \'fullName\''
  })
})

test('login wrong credentials', async (t) => {
  const app = build(t)

  const res1 = await app.inject({
    url: '/signup',
    method: 'POST',
    body: {
      fullName: 'davide d\'antonio',
      username: 'davide',
      password: 'davide'
    }
  })

  t.deepEqual(res1.statusCode, 200)

  const res2 = await app.inject({
    url: '/signin',
    method: 'POST',
    body: {
      username: 'davide',
      password: 'davide2'
    }
  })

  t.deepEqual(res2.statusCode, 400)
  t.match(JSON.parse(res2.body), { status: 'Invalid password' })
})

test('double signup', async (t) => {
  const app = build(t)

  const res1 = await app.inject({
    url: '/signup',
    method: 'POST',
    body: {
      fullName: 'davide d\'antonio',
      username: 'davide',
      password: 'davide'
    }
  })

  t.deepEqual(res1.statusCode, 200)

  const res2 = await app.inject({
    url: '/signup',
    method: 'POST',
    body: {
      fullName: 'davide d\'antonio',
      username: 'davide',
      password: 'davide'
    }
  })

  t.deepEqual(res2.statusCode, 400)
  t.match(JSON.parse(res2.body), { message: 'username already registered' })
})

test('signup and use token', async (t) => {
  const app = build(t)

  const res1 = await app.inject({
    url: '/signup',
    method: 'POST',
    body: {
      fullName: 'davide d\'antonio',
      username: 'davide',
      password: 'davide'
    }
  })

  t.deepEqual(res1.statusCode, 200)
  const body1 = JSON.parse(res1.body)
  const token = body1.token
  t.ok(token)

  const res2 = await app.inject({
    url: '/me',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  t.deepEqual(res1.statusCode, 200)
  t.match(JSON.parse(res2.body), { username: 'davide' })
})

test('signup and login', async (t) => {
  const app = build(t)

  const res1 = await app.inject({
    url: '/signup',
    method: 'POST',
    body: {
      fullName: 'davide d\'antonio',
      username: 'davide',
      password: 'davide'
    }
  })

  t.deepEqual(res1.statusCode, 200)

  const res2 = await app.inject({
    url: '/signin',
    method: 'POST',
    body: {
      username: 'davide',
      password: 'davide'
    }
  })

  t.deepEqual(res2.statusCode, 200)
  const body2 = JSON.parse(res2.body)

  const token = body2.token
  t.ok(token)

  const res3 = await app.inject({
    url: '/me',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  t.deepEqual(res3.statusCode, 200)
  t.match(JSON.parse(res3.body), { username: 'davide' })
})

test('login without password', async (t) => {
  const app = build(t)

  const res1 = await app.inject({
    url: '/signin',
    method: 'POST',
    body: {
      username: 'davide'
    }
  })

  t.deepEqual(res1.statusCode, 400)
  t.match(JSON.parse(res1.body), {
    statusCode: 400,
    error: 'Bad Request',
    message: 'body should have required property \'password\''
  })
})

test('login without username', async (t) => {
  const app = build(t)

  const res1 = await app.inject({
    url: '/signin',
    method: 'POST',
    body: {
      password: 'aaaaa'
    }
  })

  t.deepEqual(res1.statusCode, 400)
  t.match(JSON.parse(res1.body), {
    statusCode: 400,
    error: 'Bad Request',
    message: 'body should have required property \'username\''
  })
})
