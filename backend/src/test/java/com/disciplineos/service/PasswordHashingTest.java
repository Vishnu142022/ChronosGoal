package com.disciplineos.service;

import org.junit.jupiter.api.Test;
import org.mindrot.jbcrypt.BCrypt;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Sanity tests for BCrypt's one-way password verification behavior. */
class PasswordHashingTest {

    @Test
    void bcryptHashVerifiesOriginalPassword() {
        String hash = BCrypt.hashpw("correct horse battery", BCrypt.gensalt(4));
        assertTrue(BCrypt.checkpw("correct horse battery", hash));
    }

    @Test
    void bcryptHashRejectsDifferentPassword() {
        String hash = BCrypt.hashpw("correct horse battery", BCrypt.gensalt(4));
        assertFalse(BCrypt.checkpw("incorrect password", hash));
    }
}

