package com.disciplineos.dao;

/**
 * Signals an unrecoverable persistence failure from a DAO or database-backed service.
 * Servlet filters translate it into a safe API error while preserving the cause for logs.
 */
public class DataAccessException extends RuntimeException {

    /**
     * Creates a persistence exception with a diagnostic cause.
     *
     * @param message safe operation context
     * @param cause underlying JDBC or report failure
     */
    public DataAccessException(String message, Throwable cause) {
        super(message, cause);
    }
}
