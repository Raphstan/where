
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "circle_members": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"member_id": string | null,"name": string,"phone": string | null,"relation": string | null,"trust_domains": (Database["public"]['Enums']["trust_domain"])[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"member_id"?: string | null,"name": string,"phone"?: string | null,"relation"?: string | null,"trust_domains"?: (Database["public"]['Enums']["trust_domain"])[],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"member_id"?: string | null,"name"?: string,"phone"?: string | null,"relation"?: string | null,"trust_domains"?: (Database["public"]['Enums']["trust_domain"])[],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "circle_members_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "circle_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "created_at": string,"criteria": NonNullable<Json>,"id": string,"question": string,"tags": (string)[],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"criteria"?: NonNullable<Json>,"id"?: string,"question": string,"tags"?: (string)[],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"criteria"?: NonNullable<Json>,"id"?: string,"question"?: string,"tags"?: (string)[],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"forward_addresses": {
                  Row: {
                    "created_at": string,"token": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"token"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"token"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "forward_addresses_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"forwarded_emails": {
                  Row: {
                    "body_text": string,"city": string | null,"created_at": string,"from_address": string,"id": string,"kind": Database["public"]['Enums']["forwarded_email_kind"],"note": string | null,"occasion": (string)[],"place_id": string | null,"place_name": string | null,"platform": string | null,"qualified_at": string | null,"received_at": string,"recommend": string | null,"resend_email_id": string,"reserved_for": string | null,"status": Database["public"]['Enums']["forwarded_email_status"],"subject": string | null,"user_id": string,"visited": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body_text": string,"city"?: string | null,"created_at"?: string,"from_address": string,"id"?: string,"kind": Database["public"]['Enums']["forwarded_email_kind"],"note"?: string | null,"occasion"?: (string)[],"place_id"?: string | null,"place_name"?: string | null,"platform"?: string | null,"qualified_at"?: string | null,"received_at": string,"recommend"?: string | null,"resend_email_id": string,"reserved_for"?: string | null,"status": Database["public"]['Enums']["forwarded_email_status"],"subject"?: string | null,"user_id": string,"visited"?: string | null
                  }
                  Update: {
                    "body_text"?: string,"city"?: string | null,"created_at"?: string,"from_address"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["forwarded_email_kind"],"note"?: string | null,"occasion"?: (string)[],"place_id"?: string | null,"place_name"?: string | null,"platform"?: string | null,"qualified_at"?: string | null,"received_at"?: string,"recommend"?: string | null,"resend_email_id"?: string,"reserved_for"?: string | null,"status"?: Database["public"]['Enums']["forwarded_email_status"],"subject"?: string | null,"user_id"?: string,"visited"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "forwarded_emails_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "forwarded_emails_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"places": {
                  Row: {
                    "address": string | null,"area": string | null,"city": string | null,"created_at": string,"created_by": string | null,"google_place_id": string | null,"id": string,"kind": string | null,"lat": number | null,"lng": number | null,"name": string,"noise": string | null,"ontopo_url": string | null,"phone": string | null,"price": string | null,"tabit_url": string | null,"vibe": (string)[],"website_url": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"area"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"google_place_id"?: string | null,"id"?: string,"kind"?: string | null,"lat"?: number | null,"lng"?: number | null,"name": string,"noise"?: string | null,"ontopo_url"?: string | null,"phone"?: string | null,"price"?: string | null,"tabit_url"?: string | null,"vibe"?: (string)[],"website_url"?: string | null,"whatsapp"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"area"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"google_place_id"?: string | null,"id"?: string,"kind"?: string | null,"lat"?: number | null,"lng"?: number | null,"name"?: string,"noise"?: string | null,"ontopo_url"?: string | null,"phone"?: string | null,"price"?: string | null,"tabit_url"?: string | null,"vibe"?: (string)[],"website_url"?: string | null,"whatsapp"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "places_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"request_recipients": {
                  Row: {
                    "circle_member_id": string,"created_at": string,"id": string,"replied_at": string | null,"request_id": string,"sent_at": string | null,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "circle_member_id": string,"created_at"?: string,"id"?: string,"replied_at"?: string | null,"request_id": string,"sent_at"?: string | null,"token"?: string
                  }
                  Update: {
                    "circle_member_id"?: string,"created_at"?: string,"id"?: string,"replied_at"?: string | null,"request_id"?: string,"sent_at"?: string | null,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_recipients_circle_member_id_fkey"
      columns: ["circle_member_id"]
isOneToOne: false
      referencedRelation: "circle_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_recipients_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "requests"
      referencedColumns: ["id"]
    }
                  ]
                },"request_replies": {
                  Row: {
                    "created_at": string,"id": string,"note": string | null,"place_id": string | null,"place_text": string | null,"place_url": string | null,"recipient_id": string,"request_id": string,"reusable": boolean,"visible_only_to_requester": boolean,"visited": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"place_id"?: string | null,"place_text"?: string | null,"place_url"?: string | null,"recipient_id": string,"request_id": string,"reusable"?: boolean,"visible_only_to_requester"?: boolean,"visited": boolean
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"place_id"?: string | null,"place_text"?: string | null,"place_url"?: string | null,"recipient_id"?: string,"request_id"?: string,"reusable"?: boolean,"visible_only_to_requester"?: boolean,"visited"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "request_replies_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_replies_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "request_recipients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "request_replies_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "requests"
      referencedColumns: ["id"]
    }
                  ]
                },"requests": {
                  Row: {
                    "conversation_id": string | null,"created_at": string,"id": string,"message": string,"question": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id"?: string | null,"created_at"?: string,"id"?: string,"message": string,"question": string,"user_id": string
                  }
                  Update: {
                    "conversation_id"?: string | null,"created_at"?: string,"id"?: string,"message"?: string,"question"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "requests_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"signals": {
                  Row: {
                    "created_at": string,"evidence_level": Database["public"]['Enums']["evidence_level"],"id": string,"note": string | null,"occasion": (string)[],"place_id": string,"request_reply_id": string | null,"reusable": boolean,"shared_with_circle": boolean,"source_member_id": string | null,"source_type": Database["public"]['Enums']["signal_source_type"],"source_user_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"evidence_level": Database["public"]['Enums']["evidence_level"],"id"?: string,"note"?: string | null,"occasion"?: (string)[],"place_id": string,"request_reply_id"?: string | null,"reusable"?: boolean,"shared_with_circle"?: boolean,"source_member_id"?: string | null,"source_type": Database["public"]['Enums']["signal_source_type"],"source_user_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"evidence_level"?: Database["public"]['Enums']["evidence_level"],"id"?: string,"note"?: string | null,"occasion"?: (string)[],"place_id"?: string,"request_reply_id"?: string | null,"reusable"?: boolean,"shared_with_circle"?: boolean,"source_member_id"?: string | null,"source_type"?: Database["public"]['Enums']["signal_source_type"],"source_user_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "signals_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "signals_request_reply_id_fkey"
      columns: ["request_reply_id"]
isOneToOne: false
      referencedRelation: "request_replies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "signals_source_member_id_fkey"
      columns: ["source_member_id"]
isOneToOne: false
      referencedRelation: "circle_members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "signals_source_user_id_fkey"
      columns: ["source_user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "signals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "city": string | null,"created_at": string,"display_name": string | null,"email": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"created_at"?: string,"display_name"?: string | null,"email": string,"id": string
                  }
                  Update: {
                    "city"?: string | null,"created_at"?: string,"display_name"?: string | null,"email"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"visit_followups": {
                  Row: {
                    "answered_at": string | null,"booked_at": string,"conversation_id": string | null,"created_at": string,"due_at": string,"id": string,"occasion": (string)[],"place_id": string,"prompted_at": string | null,"rating": string | null,"recommend": string | null,"signal_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string | null,"booked_at"?: string,"conversation_id"?: string | null,"created_at"?: string,"due_at": string,"id"?: string,"occasion"?: (string)[],"place_id": string,"prompted_at"?: string | null,"rating"?: string | null,"recommend"?: string | null,"signal_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "answered_at"?: string | null,"booked_at"?: string,"conversation_id"?: string | null,"created_at"?: string,"due_at"?: string,"id"?: string,"occasion"?: (string)[],"place_id"?: string,"prompted_at"?: string | null,"rating"?: string | null,"recommend"?: string | null,"signal_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_followups_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_followups_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_followups_signal_id_fkey"
      columns: ["signal_id"]
isOneToOne: false
      referencedRelation: "signals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_followups_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_reply_author":
{ Args: { "p_recipient_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "evidence_level": "recommended"|"visited"|"booked_confirmed"|"booked"|"saved"|"public","forwarded_email_kind": "table"|"hotel"|"activity"|"delivery"|"cancellation"|"other","forwarded_email_status": "pending"|"qualified"|"skipped"|"cancelled"|"excluded","signal_source_type": "manual"|"email_forward"|"link_share"|"network_reply"|"public"|"post_visit_feedback"|"qualification","trust_domain": "all"|"restaurants"|"hotels"|"nightlife"|"travel"|"activities"|"family"|"business"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "evidence_level": ["recommended", "visited", "booked_confirmed", "booked", "saved", "public"],"forwarded_email_kind": ["table", "hotel", "activity", "delivery", "cancellation", "other"],"forwarded_email_status": ["pending", "qualified", "skipped", "cancelled", "excluded"],"signal_source_type": ["manual", "email_forward", "link_share", "network_reply", "public", "post_visit_feedback", "qualification"],"trust_domain": ["all", "restaurants", "hotels", "nightlife", "travel", "activities", "family", "business"]
          }
        }
} as const
