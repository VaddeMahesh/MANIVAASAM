const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Apartment Management API',
    version: '1.0.0',
    description: 'REST API for the Apartment Maintenance Management System',
  },
  servers: [
    { url: 'http://localhost:5001/api', description: 'Local development server' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login or /auth/signup',
      },
    },
    schemas: {
      // ---- Generic ----
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
      },
      // ---- Auth ----
      SignupRequest: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'password', 'apartmentName', 'address', 'numberOfFlats', 'numberOfFloors'],
        properties: {
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          email: { type: 'string', format: 'email', example: 'admin@example.com' },
          password: { type: 'string', minLength: 6, example: 'Test@123' },
          phoneNumber: { type: 'string', example: '9876543210' },
          apartmentName: { type: 'string', example: 'Greenview Residency' },
          address: {
            type: 'object',
            required: ['street', 'pinCode'],
            properties: {
              street: { type: 'string', example: 'MG Road' },
              city: { type: 'string', example: 'Hyderabad' },
              state: { type: 'string', example: 'Telangana' },
              pinCode: { type: 'string', example: '500032' },
            },
          },
          numberOfFlats: { type: 'integer', example: 24 },
          numberOfFloors: { type: 'integer', example: 4 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@example.com' },
          password: { type: 'string', example: 'Test@123' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          data: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              email: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
            },
          },
        },
      },
      // ---- Flat ----
      Flat: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          flatNumber: { type: 'string', example: 'A-101' },
          apartmentId: { type: 'string' },
          floorNumber: { type: 'integer', example: 1 },
          status: { type: 'string', enum: ['vacant', 'occupied', 'maintenance'], example: 'occupied' },
          occupationType: { type: 'string', enum: ['owned', 'rented'], example: 'owned' },
          owner: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Rajesh Kumar' },
              phone: { type: 'string', example: '9876543210' },
              email: { type: 'string', example: 'rajesh@example.com' },
            },
          },
          renter: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              phone: { type: 'string' },
              email: { type: 'string' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ---- Bill ----
      Bill: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          flatNumber: { type: 'string', example: 'A-101' },
          ownerName: { type: 'string', example: 'Rajesh Kumar' },
          billingMonth: { type: 'string', example: '2026-05' },
          amount: { type: 'number', example: 3000 },
          penalty: { type: 'number', example: 0 },
          paidAmount: { type: 'number', example: 0 },
          dueDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['pending', 'paid', 'partial', 'overdue'], example: 'pending' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      GenerateBillsRequest: {
        type: 'object',
        required: ['billingMonth', 'amount'],
        properties: {
          billingMonth: { type: 'string', example: '2026-06', description: 'Format: YYYY-MM' },
          amount: { type: 'number', example: 3000 },
          dueDayOfMonth: { type: 'integer', example: 10, description: 'Due day (default 10)' },
        },
      },
      // ---- Payment ----
      Payment: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          billId: { type: 'string' },
          flatNumber: { type: 'string', example: 'A-101' },
          ownerName: { type: 'string', example: 'Rajesh Kumar' },
          billingMonth: { type: 'string', example: '2026-05' },
          paidAmount: { type: 'number', example: 3000 },
          totalAmount: { type: 'number', example: 3000 },
          balanceAmount: { type: 'number', example: 0 },
          paymentMethod: { type: 'string', enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'online'], example: 'upi' },
          transactionId: { type: 'string', example: 'TXN123456' },
          status: { type: 'string', enum: ['paid', 'partial'], example: 'paid' },
          paymentDate: { type: 'string', format: 'date-time' },
        },
      },
      CreatePaymentRequest: {
        type: 'object',
        required: ['billId', 'paidAmount', 'paymentMethod'],
        properties: {
          billId: { type: 'string', example: '64a7f...' },
          paidAmount: { type: 'number', example: 3000 },
          paymentMethod: { type: 'string', enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'online'], example: 'upi' },
          transactionId: { type: 'string', example: 'TXN123456' },
          remarks: { type: 'string', example: 'May 2026 maintenance' },
        },
      },
      // ---- Complaint ----
      Complaint: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          flatNumber: { type: 'string', example: 'A-101' },
          residentName: { type: 'string', example: 'Rajesh Kumar' },
          category: { type: 'string', enum: ['water', 'electricity', 'lift', 'parking', 'security', 'cleaning', 'noise', 'other'], example: 'lift' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'emergency'], example: 'high' },
          status: { type: 'string', enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'], example: 'open' },
          description: { type: 'string', example: 'Lift not working on 3rd floor' },
          assignedTo: { type: 'string', example: 'Maintenance Team' },
          resolution: { type: 'string' },
          resolvedAt: { type: 'string', format: 'date-time' },
          comments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                message: { type: 'string' },
                author: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ---- Expense ----
      Expense: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          category: { type: 'string', enum: ['electricity', 'water', 'repairs', 'maintenance', 'security', 'cleaning', 'other'], example: 'electricity' },
          description: { type: 'string', example: 'Common area electricity bill' },
          amount: { type: 'number', example: 5200 },
          month: { type: 'integer', example: 5 },
          year: { type: 'integer', example: 2026 },
          status: { type: 'string', enum: ['paid', 'unpaid'], example: 'paid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // ---- Committee ----
      CommitteeMember: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Suresh Reddy' },
          role: { type: 'string', enum: ['president', 'secretary', 'treasurer', 'member'], example: 'president' },
          flatNumber: { type: 'string', example: 'A-101' },
          phone: { type: 'string', example: '9876543210' },
          email: { type: 'string', example: 'suresh@example.com' },
        },
      },
      // ---- Bank ----
      BankDetails: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          bankName: { type: 'string', example: 'State Bank of India' },
          accountNumber: { type: 'string', example: '38291047563829' },
          ifscCode: { type: 'string', example: 'SBIN0012345' },
          accountHolderName: { type: 'string', example: 'Greenview Welfare Association' },
          upiId: { type: 'string', example: 'greenview.welfare@sbi' },
        },
      },
      // ---- Notification ----
      Notification: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          type: { type: 'string', example: 'payment' },
          title: { type: 'string', example: 'Payment received' },
          message: { type: 'string', example: 'Flat A-101 paid ₹3,000 for May 2026' },
          isRead: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ===================== HEALTH =====================
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: {
          200: { description: 'Server is running', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'OK' }, timestamp: { type: 'string' } } } } } },
        },
      },
    },

    // ===================== AUTH =====================
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register new admin + apartment',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } } },
        responses: {
          201: { description: 'Registered successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin login',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
        responses: {
          200: { description: 'Reset email sent' },
          404: { description: 'Email not found' },
        },
      },
    },
    '/auth/reset-password/{token}': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using token from email',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string', minLength: 6 } } } } } },
        responses: {
          200: { description: 'Password reset successful' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password (authenticated)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['oldPassword', 'newPassword'], properties: { oldPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 6 } } } } } },
        responses: {
          200: { description: 'Password changed' },
          400: { description: 'Old password incorrect' },
        },
      },
    },

    // ===================== ADMIN =====================
    '/admin/me': {
      get: {
        tags: ['Admin'],
        summary: 'Get current admin profile (includes populated apartment)',
        responses: {
          200: { description: 'Admin profile with apartment data' },
        },
      },
      put: {
        tags: ['Admin'],
        summary: 'Update admin profile',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { firstName: { type: 'string' }, lastName: { type: 'string' }, phoneNumber: { type: 'string' } } } } } },
        responses: {
          200: { description: 'Profile updated' },
        },
      },
    },
    '/admin/surplus': {
      post: {
        tags: ['Admin'],
        summary: 'Add surplus funds to apartment',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['apartmentId', 'amount'], properties: { apartmentId: { type: 'string' }, amount: { type: 'number' }, memo: { type: 'string' } } } } } },
        responses: {
          200: { description: 'Surplus added' },
        },
      },
    },

    // ===================== APARTMENTS =====================
    '/apartments': {
      get: {
        tags: ['Apartments'],
        summary: 'List apartments for current admin',
        responses: {
          200: { description: 'List of apartments' },
        },
      },
    },
    '/apartments/{id}': {
      get: {
        tags: ['Apartments'],
        summary: 'Get apartment by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Apartment object' },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Apartments'],
        summary: 'Update apartment details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          200: { description: 'Updated apartment' },
        },
      },
    },

    // ===================== FLATS =====================
    '/flats': {
      get: {
        tags: ['Flats'],
        summary: 'List all flats for the admin\'s apartment',
        responses: {
          200: { description: 'Array of flats', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Flat' } } } } } } },
        },
      },
      post: {
        tags: ['Flats'],
        summary: 'Create a new flat',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['flatNumber', 'apartmentId', 'floorNumber'],
                properties: {
                  flatNumber: { type: 'string', example: 'A-101' },
                  apartmentId: { type: 'string' },
                  floorNumber: { type: 'integer', example: 1 },
                  status: { type: 'string', enum: ['vacant', 'occupied', 'maintenance'], default: 'vacant' },
                  occupationType: { type: 'string', enum: ['owned', 'rented'] },
                  owner: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' } } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Flat created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Flat' } } } },
          400: { description: 'Validation error' },
        },
      },
    },
    '/flats/{id}': {
      get: {
        tags: ['Flats'],
        summary: 'Get flat by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Flat object', content: { 'application/json': { schema: { $ref: '#/components/schemas/Flat' } } } },
          404: { description: 'Not found' },
        },
      },
      put: {
        tags: ['Flats'],
        summary: 'Update flat details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Flat' } } } },
        responses: { 200: { description: 'Updated flat' } },
      },
      delete: {
        tags: ['Flats'],
        summary: 'Delete a flat',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
      },
    },
    '/flats/{id}/status': {
      patch: {
        tags: ['Flats'],
        summary: 'Update flat status only',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['vacant', 'occupied', 'maintenance'] } } } } } },
        responses: { 200: { description: 'Status updated' } },
      },
    },
    '/flats/{id}/share': {
      get: {
        tags: ['Flats'],
        summary: 'Get shareable info for a flat',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Shareable flat data' } },
      },
    },

    // ===================== BILLS =====================
    '/bills': {
      get: {
        tags: ['Bills'],
        summary: 'List bills (filter by month, status, flatId)',
        parameters: [
          { name: 'billingMonth', in: 'query', schema: { type: 'string', example: '2026-05' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'paid', 'partial', 'overdue'] } },
          { name: 'flatId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Array of bills', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Bill' } } } } } } },
        },
      },
      post: {
        tags: ['Bills'],
        summary: 'Create a single bill manually',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['flatId', 'billingMonth', 'amount'],
                properties: {
                  flatId: { type: 'string' },
                  billingMonth: { type: 'string', example: '2026-06' },
                  amount: { type: 'number', example: 3000 },
                  dueDate: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Bill created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bill' } } } } },
      },
    },
    '/bills/generate': {
      post: {
        tags: ['Bills'],
        summary: 'Bulk-generate bills for all occupied flats in a month',
        description: 'Automatically skips flats that already have a bill for the given month.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GenerateBillsRequest' } } } },
        responses: {
          201: { description: 'Bills generated', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Bill' } }, message: { type: 'string', example: 'Generated 10 bills, skipped 2 (already exist)' } } } } } },
          400: { description: 'No occupied flats found' },
        },
      },
    },
    '/bills/{id}': {
      get: {
        tags: ['Bills'],
        summary: 'Get bill by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Bill object', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bill' } } } }, 404: { description: 'Not found' } },
      },
      put: {
        tags: ['Bills'],
        summary: 'Update bill (status auto-derived from paidAmount)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Bill' } } } },
        responses: { 200: { description: 'Updated bill' } },
      },
      delete: {
        tags: ['Bills'],
        summary: 'Delete a bill',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
      },
    },

    // ===================== PAYMENTS =====================
    '/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List payments (filter by flatId, billingMonth, status)',
        parameters: [
          { name: 'flatId', in: 'query', schema: { type: 'string' } },
          { name: 'billingMonth', in: 'query', schema: { type: 'string', example: '2026-05' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['paid', 'partial'] } },
        ],
        responses: { 200: { description: 'Array of payments', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Payment' } } } } } } } },
      },
      post: {
        tags: ['Payments'],
        summary: 'Record a payment against a bill',
        description: 'Updates the bill\'s paidAmount and status automatically.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePaymentRequest' } } } },
        responses: { 201: { description: 'Payment recorded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } }, 404: { description: 'Bill not found' } },
      },
    },
    '/payments/defaulters': {
      get: {
        tags: ['Payments'],
        summary: 'List defaulters — bills with status pending or overdue',
        responses: { 200: { description: 'Array of pending/overdue bills' } },
      },
    },
    '/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Payment object', content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } }, 404: { description: 'Not found' } },
      },
      put: {
        tags: ['Payments'],
        summary: 'Update payment record',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } },
        responses: { 200: { description: 'Updated payment' } },
      },
    },

    // ===================== COMPLAINTS =====================
    '/complaints': {
      get: {
        tags: ['Complaints'],
        summary: 'List complaints (filter by status, priority, flatId)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'emergency'] } },
          { name: 'flatId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Array of complaints', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Complaint' } } } } } } } },
      },
      post: {
        tags: ['Complaints'],
        summary: 'File a new complaint',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['flatNumber', 'residentName', 'category', 'description'],
                properties: {
                  flatNumber: { type: 'string', example: 'A-101' },
                  residentName: { type: 'string', example: 'Rajesh Kumar' },
                  category: { type: 'string', enum: ['water', 'electricity', 'lift', 'parking', 'security', 'cleaning', 'noise', 'other'] },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'emergency'], default: 'medium' },
                  description: { type: 'string', example: 'Lift not working on 3rd floor' },
                  flatId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Complaint filed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Complaint' } } } } },
      },
    },
    '/complaints/{id}': {
      get: {
        tags: ['Complaints'],
        summary: 'Get complaint by ID (includes comments)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Complaint object', content: { 'application/json': { schema: { $ref: '#/components/schemas/Complaint' } } } }, 404: { description: 'Not found' } },
      },
      put: {
        tags: ['Complaints'],
        summary: 'Update complaint (status, assignedTo, resolution)',
        description: 'Setting status to "resolved" auto-sets resolvedAt.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'] },
                  assignedTo: { type: 'string' },
                  resolution: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'emergency'] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated complaint' } },
      },
      delete: {
        tags: ['Complaints'],
        summary: 'Delete a complaint',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
      },
    },
    '/complaints/{id}/comments': {
      post: {
        tags: ['Complaints'],
        summary: 'Add a comment to a complaint',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string', example: 'Technician will visit tomorrow' }, author: { type: 'string', example: 'Admin' } } } } } },
        responses: { 200: { description: 'Updated complaint with new comment' } },
      },
    },

    // ===================== EXPENSES =====================
    '/expenses': {
      get: {
        tags: ['Expenses'],
        summary: 'List all expenses',
        responses: { 200: { description: 'Array of expenses', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Expense' } } } } } } } },
      },
      post: {
        tags: ['Expenses'],
        summary: 'Create an expense record',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['apartmentId', 'month', 'year', 'amount'],
                properties: {
                  apartmentId: { type: 'string' },
                  category: { type: 'string', enum: ['electricity', 'water', 'repairs', 'maintenance', 'security', 'cleaning', 'other'], default: 'other' },
                  description: { type: 'string', example: 'Monthly electricity bill' },
                  amount: { type: 'number', example: 5200 },
                  month: { type: 'integer', example: 5 },
                  year: { type: 'integer', example: 2026 },
                  status: { type: 'string', enum: ['paid', 'unpaid'], default: 'unpaid' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Expense created' } },
      },
    },
    '/expenses/summary': {
      get: {
        tags: ['Expenses'],
        summary: 'Get expense summary totals',
        responses: { 200: { description: 'Summary object' } },
      },
    },
    '/expenses/{id}': {
      get: {
        tags: ['Expenses'],
        summary: 'Get expense by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Expense object' }, 404: { description: 'Not found' } },
      },
      put: {
        tags: ['Expenses'],
        summary: 'Update expense',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Expense' } } } },
        responses: { 200: { description: 'Updated expense' } },
      },
      delete: {
        tags: ['Expenses'],
        summary: 'Delete expense',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
      },
    },

    // ===================== COMMITTEE =====================
    '/committee': {
      get: {
        tags: ['Committee'],
        summary: 'List committee members',
        responses: { 200: { description: 'Array of members', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/CommitteeMember' } } } } } } } },
      },
      post: {
        tags: ['Committee'],
        summary: 'Add a committee member',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'role', 'flatNumber'],
                properties: {
                  name: { type: 'string', example: 'Suresh Reddy' },
                  role: { type: 'string', enum: ['president', 'secretary', 'treasurer', 'member'] },
                  flatNumber: { type: 'string', example: 'A-101' },
                  phone: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Member added' } },
      },
    },
    '/committee/{id}': {
      put: {
        tags: ['Committee'],
        summary: 'Update committee member',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CommitteeMember' } } } },
        responses: { 200: { description: 'Updated member' } },
      },
      delete: {
        tags: ['Committee'],
        summary: 'Remove committee member',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Member removed' } },
      },
    },

    // ===================== BANK DETAILS =====================
    '/bank': {
      get: {
        tags: ['Bank Details'],
        summary: 'Get bank details for the apartment',
        responses: { 200: { description: 'Bank details object', content: { 'application/json': { schema: { $ref: '#/components/schemas/BankDetails' } } } } },
      },
      post: {
        tags: ['Bank Details'],
        summary: 'Create or update bank details',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  bankName: { type: 'string', example: 'State Bank of India' },
                  accountNumber: { type: 'string', example: '38291047563829' },
                  ifscCode: { type: 'string', example: 'SBIN0012345' },
                  accountHolderName: { type: 'string', example: 'Greenview Welfare Association' },
                  upiId: { type: 'string', example: 'greenview.welfare@sbi' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Bank details saved' } },
      },
    },
    '/bank/{id}': {
      delete: {
        tags: ['Bank Details'],
        summary: 'Delete bank details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Deleted' } },
      },
    },

    // ===================== NOTIFICATIONS =====================
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications for current admin (latest 50)',
        responses: { 200: { description: 'Array of notifications', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } } } } },
      },
    },
    '/notifications/read-all': {
      put: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        responses: { 200: { description: 'All marked as read' } },
      },
    },
    '/notifications/{id}/read': {
      put: {
        tags: ['Notifications'],
        summary: 'Mark a single notification as read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Marked as read' }, 404: { description: 'Not found' } },
      },
    },

    // ===================== REPORTS =====================
    '/reports/financial': {
      get: {
        tags: ['Reports'],
        summary: 'Financial summary — total collected, expenses, net balance',
        parameters: [{ name: 'year', in: 'query', schema: { type: 'integer', example: 2026 } }],
        responses: {
          200: {
            description: 'Financial summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        totalCollected: { type: 'number', example: 72000 },
                        totalExpenses: { type: 'number', example: 31000 },
                        netBalance: { type: 'number', example: 41000 },
                        totalBilled: { type: 'number', example: 90000 },
                        totalPenalty: { type: 'number', example: 1500 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reports/collections': {
      get: {
        tags: ['Reports'],
        summary: 'Monthly collections breakdown with status counts',
        responses: {
          200: {
            description: 'Collections report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        monthly: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string', example: '2026-05' }, totalBilled: { type: 'number' }, totalCollected: { type: 'number' }, paid: { type: 'integer' }, pending: { type: 'integer' } } } },
                        statusBreakdown: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, count: { type: 'integer' } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reports/expenses': {
      get: {
        tags: ['Reports'],
        summary: 'Expense breakdown by category and month',
        parameters: [{ name: 'year', in: 'query', schema: { type: 'integer', example: 2026 } }],
        responses: {
          200: {
            description: 'Expenses report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        byCategory: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, total: { type: 'number' }, count: { type: 'integer' } } } },
                        monthly: { type: 'array', items: { type: 'object', properties: { _id: { type: 'object', properties: { year: { type: 'integer' }, month: { type: 'integer' } } }, total: { type: 'number' } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reports/complaints': {
      get: {
        tags: ['Reports'],
        summary: 'Complaint stats by status, category, and priority',
        responses: {
          200: {
            description: 'Complaints report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 12 },
                        byStatus: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, count: { type: 'integer' } } } },
                        byCategory: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, count: { type: 'integer' } } } },
                        byPriority: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, count: { type: 'integer' } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reports/occupancy': {
      get: {
        tags: ['Reports'],
        summary: 'Flat occupancy rates and type breakdown',
        responses: {
          200: {
            description: 'Occupancy report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 24 },
                        byStatus: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, count: { type: 'integer' } } } },
                        byType: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, count: { type: 'integer' } } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Server health check' },
    { name: 'Auth', description: 'Signup, login, password management' },
    { name: 'Admin', description: 'Admin profile management' },
    { name: 'Apartments', description: 'Apartment CRUD' },
    { name: 'Flats', description: 'Flat management' },
    { name: 'Bills', description: 'Maintenance billing' },
    { name: 'Payments', description: 'Payment collection and tracking' },
    { name: 'Complaints', description: 'Resident complaint management' },
    { name: 'Expenses', description: 'Apartment expense tracking' },
    { name: 'Committee', description: 'Welfare committee members' },
    { name: 'Bank Details', description: 'Apartment bank account info' },
    { name: 'Notifications', description: 'In-app notifications' },
    { name: 'Reports', description: 'Analytics and aggregated reports' },
  ],
};

module.exports = swaggerDefinition;
