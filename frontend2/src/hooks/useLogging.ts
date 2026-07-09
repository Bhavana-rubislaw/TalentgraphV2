/**
 * React hooks for comprehensive logging integration
 * Provides easy-to-use hooks for different types of logging
 */

import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import logger from '../utils/logger';

// Hook for logging user actions
export const useActionLogger = () => {
  const logAction = useCallback((
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, any>
  ) => {
    logger.logUserAction(action, entityType, entityId, metadata);
  }, []);

  return { logAction };
};

// Hook for automatic navigation logging
export const useNavigationLogger = () => {
  const location = useLocation();
  const prevLocation = useRef<string>();

  useEffect(() => {
    if (prevLocation.current && prevLocation.current !== location.pathname) {
      logger.logNavigation(prevLocation.current, location.pathname, {
        search: location.search,
        hash: location.hash,
        state: location.state
      });
    }
    prevLocation.current = location.pathname;
  }, [location]);
};

// Hook for component lifecycle logging
export const useComponentLogger = (componentName: string) => {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      logger.logComponentLifecycle(componentName, 'mount');
      mounted.current = true;

      return () => {
        logger.logComponentLifecycle(componentName, 'unmount');
      };
    }
  }, [componentName]);

  const logUpdate = useCallback((metadata?: Record<string, any>) => {
    logger.logComponentLifecycle(componentName, 'update', metadata);
  }, [componentName]);

  return { logUpdate };
};

// Hook for API call logging with automatic request/response tracking
export const useApiLogger = () => {
  const logApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    method: string,
    url: string,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = Math.round(performance.now() - startTime);
      
      logger.logApiCall(method, url, 200, duration, {
        ...metadata,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      const status = error instanceof Error && 'status' in error ? 
        (error as any).status : 500;
      
      logger.logApiCall(method, url, status, duration, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }, []);

  return { logApiCall };
};

// Hook for form interaction logging
export const useFormLogger = (formName: string) => {
  const logFormStart = useCallback(() => {
    logger.logUserAction('form_start', 'form', formName);
  }, [formName]);

  const logFormField = useCallback((fieldName: string, action: 'focus' | 'blur' | 'change') => {
    logger.debug(`Form field ${action}: ${fieldName}`, 'FormLogger', {
      action: `form_field_${action}`,
      entityType: 'form_field',
      entityId: `${formName}.${fieldName}`,
      metadata: { formName, fieldName, action }
    });
  }, [formName]);

  const logFormSubmit = useCallback((success: boolean, errors?: Record<string, string>) => {
    logger.logUserAction(
      success ? 'form_submit_success' : 'form_submit_error', 
      'form', 
      formName, 
      { success, errors, errorCount: errors ? Object.keys(errors).length : 0 }
    );
  }, [formName]);

  const logFormValidation = useCallback((isValid: boolean, errorFields: string[] = []) => {
    logger.debug(`Form validation: ${isValid ? 'passed' : 'failed'}`, 'FormLogger', {
      action: 'form_validation',
      entityType: 'form',
      entityId: formName,
      metadata: { isValid, errorFields, errorCount: errorFields.length }
    });
  }, [formName]);

  return { 
    logFormStart, 
    logFormField, 
    logFormSubmit, 
    logFormValidation 
  };
};

// Hook for error boundary logging
export const useErrorLogger = () => {
  const logError = useCallback((
    error: Error,
    errorInfo: { componentStack: string },
    componentName?: string
  ) => {
    logger.critical(
      `React error boundary caught error in ${componentName || 'unknown component'}`,
      'ErrorBoundary',
      error,
      {
        action: 'error_boundary_catch',
        entityType: 'component',
        entityId: componentName,
        metadata: {
          componentStack: errorInfo.componentStack,
          errorName: error.name,
          errorMessage: error.message
        }
      }
    );
  }, []);

  const logRecovery = useCallback((componentName?: string) => {
    logger.info(
      `Error boundary recovered in ${componentName || 'unknown component'}`,
      'ErrorBoundary',
      {
        action: 'error_boundary_recovery',
        entityType: 'component',
        entityId: componentName
      }
    );
  }, []);

  return { logError, logRecovery };
};

// Hook for performance monitoring
export const usePerformanceLogger = () => {
  const logPerformance = useCallback((
    operationName: string,
    duration: number,
    metadata?: Record<string, any>
  ) => {
    const level = duration > 1000 ? 'WARNING' : duration > 500 ? 'INFO' : 'DEBUG';
    
    logger[level.toLowerCase() as keyof typeof logger](
      `Performance: ${operationName} took ${duration}ms`,
      'Performance',
      {
        action: 'performance_measure',
        entityType: 'operation',
        entityId: operationName,
        metadata: { duration, ...metadata }
      }
    );
  }, []);

  const measureAsync = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = Math.round(performance.now() - startTime);
      
      logPerformance(operationName, duration, {
        ...metadata,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      
      logPerformance(operationName, duration, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }, [logPerformance]);

  const measureSync = useCallback(<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T => {
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = Math.round(performance.now() - startTime);
      
      logPerformance(operationName, duration, {
        ...metadata,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      
      logPerformance(operationName, duration, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }, [logPerformance]);

  return { logPerformance, measureAsync, measureSync };
};

// Hook for search and filter logging
export const useSearchLogger = () => {
  const logSearch = useCallback((
    query: string,
    entityType: string,
    results: number,
    filters?: Record<string, any>,
    duration?: number
  ) => {
    logger.logUserAction('search', entityType, undefined, {
      query: query.length > 100 ? `${query.substring(0, 100)}...` : query,
      queryLength: query.length,
      resultCount: results,
      filters,
      duration
    });
  }, []);

  const logFilter = useCallback((
    filterName: string,
    filterValue: any,
    entityType: string,
    results: number
  ) => {
    logger.logUserAction('filter', entityType, undefined, {
      filterName,
      filterValue,
      resultCount: results
    });
  }, []);

  const logSort = useCallback((
    sortField: string,
    sortDirection: 'asc' | 'desc',
    entityType: string
  ) => {
    logger.logUserAction('sort', entityType, undefined, {
      sortField,
      sortDirection
    });
  }, []);

  return { logSearch, logFilter, logSort };
};