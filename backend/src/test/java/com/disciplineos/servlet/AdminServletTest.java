package com.disciplineos.servlet;

import com.disciplineos.dao.AdminDAO;
import com.disciplineos.service.AdminDashboardReportService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

/** Tests the administrator servlet's role authorization boundary. */
class AdminServletTest {

    @Test
    void rejectsUnauthenticatedAdministratorRequests() throws Exception {
        AdminDAO adminDAO = mock(AdminDAO.class);
        AdminServlet servlet = new AdminServlet(adminDAO,
                new AdminDashboardReportService(adminDAO));
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        try {
            servlet.doGet(request, response);
            verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            verify(adminDAO, never()).getStats();
        } finally {
            servlet.destroy();
        }
    }

    @Test
    void rejectsNonAdministratorSession() throws Exception {
        AdminDAO adminDAO = mock(AdminDAO.class);
        AdminDashboardReportService reports =
                new AdminDashboardReportService(adminDAO);
        AdminServlet servlet = new AdminServlet(adminDAO, reports);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("user-1");
        when(session.getAttribute("userRole")).thenReturn("USER");
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        try {
            servlet.doGet(request, response);
            verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        } finally {
            servlet.destroy();
        }
    }

    @Test
    void allowsAdministratorToReadStats() throws Exception {
        AdminDAO adminDAO = mock(AdminDAO.class);
        AdminServlet servlet = new AdminServlet(adminDAO,
                new AdminDashboardReportService(adminDAO));
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("admin-1");
        when(session.getAttribute("userRole")).thenReturn("ADMIN");
        when(request.getPathInfo()).thenReturn("/stats");
        when(adminDAO.getStats()).thenReturn(java.util.Map.of("users", 1));
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        try {
            servlet.doGet(request, response);
            verify(adminDAO).getStats();
            verify(response).setStatus(HttpServletResponse.SC_OK);
        } finally {
            servlet.destroy();
        }
    }
}

