// CanbusStream.end(): a reconnect it planned before must not open the port
// again.

import { EventEmitter } from 'events'

const mockChannels: EventEmitter[] = []
let mockOpenFails = false

jest.mock('./canSocket', () => ({
  CAN_RAW_FILTER_MAX: 512,
  CanChannel: class extends (jest.requireActual('events')
    .EventEmitter as typeof EventEmitter) {
    excludedPgns = []
    constructor() {
      super()
      if (mockOpenFails) {
        throw new Error('No such device')
      }
      mockChannels.push(this)
    }
    start() {}
    stop() {}
    send() {}
  }
}))

jest.mock('./candevice', () => ({
  CanDevice: class {
    start() {}
    stop() {}
  }
}))

import { CanbusStream } from './canbus'

const setProviderError = jest.fn()
const newStream = () =>
  new (CanbusStream as any)({
    app: Object.assign(new EventEmitter(), {
      setProviderStatus: () => {},
      setProviderError
    }),
    canDevice: 'can1'
  })

beforeEach(() => {
  jest.useFakeTimers()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'log').mockImplementation(() => {})
  mockChannels.length = 0
  mockOpenFails = false
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('CanbusStream end', () => {
  test('after the channel stopped unexpectedly', () => {
    const stream = newStream()
    mockChannels[0].emit('onStopped')
    stream.end()
    setProviderError.mockClear()
    jest.runAllTimers()
    expect(mockChannels).toHaveLength(1)
    // It would land on the connection that replaces this one
    expect(setProviderError).not.toHaveBeenCalled()
  })

  test('after a connect that failed', () => {
    mockOpenFails = true
    const stream = newStream()
    mockOpenFails = false
    stream.end()
    jest.runAllTimers()
    expect(mockChannels).toHaveLength(0)
  })
})
