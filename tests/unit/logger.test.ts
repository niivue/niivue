import { log } from '../../src/logger';
import { expect, test, describe, beforeEach, vi } from 'vitest'
describe('Logger', () => {
    beforeEach(() => {
        // Reset log level and name before each test
        log.setLogLevel('debug');
        log.setName('niivue');
    });

    test('should set the log level correctly', () => {
        log.setLogLevel('debug');
        expect(log.level).toBe('debug');
    });

    test('should set the log name correctly', () => {
        log.setName('custom');
        expect(log.name).toBe('custom');
    });

    test('should log debug messages', () => {
        const consoleMock = vi.spyOn(console, 'debug');
        log.debug('Debug message');
        expect(consoleMock).toHaveBeenCalledOnce();
        consoleMock.mockReset();
    });

    test('should log info messages', () => {
        const consoleMock = vi.spyOn(console, 'info');
        log.info('Info message');
        expect(consoleMock).toHaveBeenCalledOnce();
        consoleMock.mockReset();
    });

    test('should log warn messages', () => {
        const consoleMock = vi.spyOn(console, 'warn');
        log.warn('Warn message');
        expect(consoleMock).toHaveBeenCalledOnce();
        consoleMock.mockReset();
    });

    test('should log error messages', () => {
        const consoleMock = vi.spyOn(console, 'error');
        log.error('Error message');
        expect(consoleMock).toHaveBeenCalledOnce();
        consoleMock.mockReset();
    });

    test('should log fatal messages', () => {
        const consoleMock = vi.spyOn(console, 'error');
        log.fatal('Fatal message');
        expect(consoleMock).toHaveBeenCalledOnce();
        consoleMock.mockReset();
    });

    // test that silent works
    test('should not log debug messages when level is silent', () => {
        const consoleMock = vi.spyOn(console, 'debug');
        log.setLogLevel('silent');
        log.debug('Debug message');
        expect(consoleMock).not.toHaveBeenCalled();
        consoleMock.mockReset();
    });

    // test that debug not logged when level is info
    test('should not log debug messages when level is info', () => {
        const consoleMock = vi.spyOn(console, 'debug');
        log.setLogLevel('info');
        log.debug('Debug message');
        expect(consoleMock).not.toHaveBeenCalled();
        consoleMock.mockReset();
    });

    // test that info is not logged when level is warn
    test('should not log info messages when level is warn', () => {
        const consoleMock = vi.spyOn(console, 'info');
        log.setLogLevel('warn');
        log.info('Info message');
        expect(consoleMock).not.toHaveBeenCalled();
        consoleMock.mockReset();
    });

    // test that warn is not logged when level is error
    test('should not log warn messages when level is error', () => {
        const consoleMock = vi.spyOn(console, 'warn');
        log.setLogLevel('error');
        log.warn('Warn message');
        expect(consoleMock).not.toHaveBeenCalled();
        consoleMock.mockReset();
    });
});
