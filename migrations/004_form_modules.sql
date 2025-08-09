-- Create form_modules table if it doesn't exist
CREATE TABLE IF NOT EXISTS form_modules (
    id SERIAL PRIMARY KEY,
    module_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phase_keys VARCHAR(50)[] DEFAULT '{}',
    schema JSONB NOT NULL,
    ui_schema JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create forms_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS forms_data (
    id SERIAL PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase_key VARCHAR(50) NOT NULL,
    module_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    submitted_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, phase_key, module_id)
);

-- Insert form modules for the 8-step workflow
INSERT INTO form_modules (module_id, name, description, phase_filters, schema) VALUES 
-- Onboarding Phase Forms
('intake_base', 'Project Intake Form', 'Basic project information and requirements', ARRAY['ONB'], '{
  "type": "object",
  "title": "Project Intake Form",
  "required": ["project_type", "project_goals", "timeline", "budget_range"],
  "properties": {
    "project_type": {
      "type": "string",
      "title": "Project Type",
      "enum": ["website", "print", "branding", "book-cover", "screen-print", "large-format"],
      "enumNames": ["Website Development", "Print Design", "Branding Package", "Book Cover Design", "Screen Printing", "Large Format Print"]
    },
    "project_goals": {
      "type": "string",
      "title": "Project Goals",
      "minLength": 10,
      "description": "What are your main goals for this project?"
    },
    "target_audience": {
      "type": "string",
      "title": "Target Audience",
      "description": "Who is your target audience?"
    },
    "timeline": {
      "type": "string",
      "title": "Timeline",
      "enum": ["asap", "1-week", "2-weeks", "1-month", "flexible"],
      "enumNames": ["ASAP (Rush +25%)", "1 Week", "2 Weeks", "1 Month", "Flexible"]
    },
    "budget_range": {
      "type": "string",
      "title": "Budget Range",
      "enum": ["500-1000", "1000-2500", "2500-5000", "5000-10000", "10000+"],
      "enumNames": ["$500 - $1,000", "$1,000 - $2,500", "$2,500 - $5,000", "$5,000 - $10,000", "$10,000+"]
    },
    "additional_details": {
      "type": "string",
      "title": "Additional Details",
      "description": "Any specific requirements or preferences?"
    }
  }
}'),

-- Ideation Phase Forms
('creative_brief', 'Creative Brief', 'Project vision and creative direction', ARRAY['IDEA'], '{
  "type": "object",
  "title": "Creative Brief Response",
  "required": ["brief_approval"],
  "properties": {
    "brief_approval": {
      "type": "string",
      "title": "Brief Approval",
      "enum": ["approved", "changes_needed"],
      "enumNames": ["Approved - Proceed with this direction", "Changes Needed"]
    },
    "feedback": {
      "type": "string",
      "title": "Feedback",
      "description": "Any specific feedback on the creative direction?"
    },
    "reference_links": {
      "type": "string",
      "title": "Reference Links",
      "description": "Any reference materials or inspiration?"
    }
  }
}'),

-- Design Phase Forms
('design_feedback', 'Design Feedback', 'Feedback on design drafts', ARRAY['DSGN'], '{
  "type": "object",
  "title": "Design Feedback",
  "properties": {
    "overall_impression": {
      "type": "string",
      "title": "Overall Impression",
      "enum": ["love-it", "close", "major-changes", "wrong-direction"],
      "enumNames": ["Love it! Minor tweaks only", "Close, but needs some changes", "Needs major changes", "Wrong direction entirely"]
    },
    "specific_feedback": {
      "type": "string",
      "title": "Specific Feedback",
      "description": "What works? What doesn''t? What changes would you like?"
    },
    "areas_for_change": {
      "type": "array",
      "title": "Areas Needing Changes",
      "items": {
        "type": "string",
        "enum": ["colors", "typography", "layout", "imagery", "content"]
      },
      "uniqueItems": true
    }
  }
}'),

-- Review Phase Forms
('proof_approval', 'Proof Approval', 'Final proof approval checklist', ARRAY['REV'], '{
  "type": "object",
  "title": "Proof Approval",
  "required": ["approval_status"],
  "properties": {
    "approval_status": {
      "type": "string",
      "title": "Approval Status",
      "enum": ["approved", "changes_required"],
      "enumNames": ["Approved - Proceed to Production", "Changes Required"]
    },
    "proof_checklist": {
      "type": "object",
      "title": "Proof Checklist",
      "properties": {
        "colors_accurate": {
          "type": "boolean",
          "title": "Colors are accurate"
        },
        "text_correct": {
          "type": "boolean",
          "title": "All text is correct (no typos)"
        },
        "layout_approved": {
          "type": "boolean",
          "title": "Layout is approved"
        },
        "images_quality": {
          "type": "boolean",
          "title": "Images are high quality"
        },
        "dimensions_correct": {
          "type": "boolean",
          "title": "Dimensions are correct"
        }
      }
    },
    "change_requests": {
      "type": "string",
      "title": "Change Requests",
      "description": "If changes are required, please describe them"
    }
  }
}'),

-- Production Phase Forms
('production_check', 'Production Check', 'Production quality check', ARRAY['PROD'], '{
  "type": "object",
  "title": "Production Check",
  "properties": {
    "press_check_required": {
      "type": "boolean",
      "title": "Press Check Required",
      "description": "Do you want to do a press check for color-critical work?"
    },
    "special_instructions": {
      "type": "string",
      "title": "Special Instructions",
      "description": "Any special production instructions?"
    }
  }
}'),

-- Payment Phase Forms  
('payment_confirmation', 'Payment Confirmation', 'Payment details and confirmation', ARRAY['PAY'], '{
  "type": "object",
  "title": "Payment Information",
  "properties": {
    "payment_method": {
      "type": "string",
      "title": "Payment Method",
      "enum": ["credit_card", "ach", "check"],
      "enumNames": ["Credit Card", "ACH Transfer", "Check"]
    },
    "billing_address_same": {
      "type": "boolean",
      "title": "Billing address same as company address"
    }
  }
}'),

-- Sign-off Phase Forms
('completion_agreement', 'Completion Agreement', 'Project completion and rights transfer', ARRAY['SIGN'], '{
  "type": "object",
  "title": "Project Completion Agreement",
  "required": ["satisfaction_level", "rights_transfer_acknowledged"],
  "properties": {
    "satisfaction_level": {
      "type": "string",
      "title": "Satisfaction Level",
      "enum": ["very_satisfied", "satisfied", "neutral", "dissatisfied"],
      "enumNames": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"]
    },
    "rights_transfer_acknowledged": {
      "type": "boolean",
      "title": "I acknowledge the transfer of rights upon full payment"
    },
    "testimonial": {
      "type": "string",
      "title": "Testimonial (Optional)",
      "description": "We''d love to hear about your experience!"
    }
  }
}'),

-- Launch Phase Forms
('launch_checklist', 'Launch Checklist', 'Final launch confirmation', ARRAY['LAUNCH'], '{
  "type": "object",
  "title": "Launch Checklist",
  "properties": {
    "deliverables_received": {
      "type": "boolean",
      "title": "All deliverables received"
    },
    "launch_date": {
      "type": "string",
      "format": "date",
      "title": "Launch/Go-Live Date"
    },
    "followup_needed": {
      "type": "boolean",
      "title": "Follow-up support needed"
    },
    "reorder_interest": {
      "type": "boolean",
      "title": "Interested in future projects"
    }
  }
}')
ON CONFLICT (module_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  phase_filters = EXCLUDED.phase_filters,
  schema = EXCLUDED.schema,
  updated_at = CURRENT_TIMESTAMP;