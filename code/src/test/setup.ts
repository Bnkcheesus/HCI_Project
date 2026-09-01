import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'
import { installFakeApi, resetFakeApi } from './fakeApi'

/*
 * Every screen fetches now, so every test needs something on the other end. Installed
 * globally rather than per-suite: a component that quietly starts fetching something new
 * should get an answer, not an unhandled rejection in a suite that was not thinking about
 * the network.
 *
 * Reset before each test, because borrowing writes — a checkout test that decrements a
 * copy count must not hand the next test a library one book short.
 */
installFakeApi()
beforeEach(resetFakeApi)
