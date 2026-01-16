/**
 * 🔍 DIAGNOSTIC TOOL: Database Schema Checker
 * Checks actual database columns vs code expectations
 */

import { Context } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

export async function runDatabaseDiagnostics(c: Context) {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: [],
    errors: [],
    warnings: [],
    summary: "",
  };

  const supabase = supabaseClient();

  try {
    console.log("🔍 Starting Database Diagnostics...");

    // ====================================================================
    // CHECK 1: Banners Table Schema
    // ====================================================================
    console.log("\n📋 CHECK 1: Banners Table Schema");
    try {
      const { data: bannerData, error: bannerError } = await supabase
        .from("banners")
        .select("*")
        .limit(1);

      if (bannerError) {
        results.errors.push({
          check: "banners_table_access",
          error: bannerError.message,
          code: bannerError.code,
          details: bannerError.details,
          hint: bannerError.hint,
        });
        console.error("❌ Cannot access banners table:", bannerError);
      } else {
        const columns = bannerData && bannerData.length > 0 
          ? Object.keys(bannerData[0]) 
          : [];
        
        results.checks.push({
          check: "banners_table_access",
          status: "✅ SUCCESS",
          rowCount: bannerData?.length || 0,
          columns: columns.length > 0 ? columns : "No data - checking via info schema",
        });
        console.log("✅ Banners table accessible");
        console.log("Columns found:", columns);
      }
    } catch (e: any) {
      results.errors.push({
        check: "banners_table_access",
        error: e.message,
        stack: e.stack,
      });
    }

    // ====================================================================
    // CHECK 2: Query Information Schema for Banners Table
    // ====================================================================
    console.log("\n📋 CHECK 2: Query Banners Columns from Information Schema");
    try {
      const { data: schemaData, error: schemaError } = await supabase.rpc(
        "get_banners_columns"
      );

      if (schemaError) {
        // RPC might not exist, try direct query
        console.log("⚠️  RPC not found, trying direct SQL...");
        
        // Try a test insert with minimal fields to see what fails
        const testInsert = {
          title: "DIAGNOSTIC_TEST",
          image_url: "https://test.com/test.jpg",
        };
        
        const { data: insertTest, error: insertError } = await supabase
          .from("banners")
          .insert(testInsert)
          .select();

        if (insertError) {
          results.errors.push({
            check: "banners_minimal_insert",
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            attemptedInsert: testInsert,
          });
          console.error("❌ Minimal insert failed:", insertError);
        } else {
          results.checks.push({
            check: "banners_minimal_insert",
            status: "✅ SUCCESS",
            insertedId: insertTest?.[0]?.id,
          });
          console.log("✅ Minimal insert succeeded");
          
          // Clean up test data
          if (insertTest?.[0]?.id) {
            await supabase.from("banners").delete().eq("id", insertTest[0].id);
            console.log("🧹 Test data cleaned up");
          }
        }
      } else {
        results.checks.push({
          check: "banners_schema_query",
          status: "✅ SUCCESS",
          data: schemaData,
        });
      }
    } catch (e: any) {
      results.warnings.push({
        check: "banners_schema_query",
        message: "Could not query schema directly",
        error: e.message,
      });
    }

    // ====================================================================
    // CHECK 3: Test Insert with Current Code Fields
    // ====================================================================
    console.log("\n📋 CHECK 3: Test Insert with Actual Upload Fields");
    
    const currentCodeFields = {
      title: "DIAGNOSTIC_FULL_TEST",
      description: "Test banner for diagnostics",
      original_url: "https://test.com/original.jpg",
      image_url: "https://test.com/image.jpg",
      thumbnail_url: "https://test.com/thumb.jpg",
      banner_type: "home",
      order_index: 0,
      publish_status: "draft",
      visibility: "private",
      published_at: null,
    };

    console.log("Testing insert with fields:", Object.keys(currentCodeFields));

    try {
      const { data: fullInsert, error: fullError } = await supabase
        .from("banners")
        .insert(currentCodeFields)
        .select();

      if (fullError) {
        results.errors.push({
          check: "banners_full_insert",
          error: fullError.message,
          code: fullError.code,
          details: fullError.details,
          hint: fullError.hint,
          attemptedFields: Object.keys(currentCodeFields),
        });
        console.error("❌ Full insert failed:", fullError);
        
        // Parse the error to find which column is missing
        if (fullError.message.includes("could not find") || fullError.code === "PGRST204") {
          const missingColumn = fullError.message.match(/'([^']+)'/)?.[1];
          results.warnings.push({
            check: "missing_column_detection",
            missingColumn: missingColumn || "unknown",
            message: `The column '${missingColumn}' does not exist in the banners table`,
            recommendation: `Remove '${missingColumn}' from the insert operation or add it to the database schema`,
          });
        }
      } else {
        results.checks.push({
          check: "banners_full_insert",
          status: "✅ SUCCESS",
          insertedId: fullInsert?.[0]?.id,
          insertedData: fullInsert?.[0],
        });
        console.log("✅ Full insert succeeded");
        
        // Clean up
        if (fullInsert?.[0]?.id) {
          await supabase.from("banners").delete().eq("id", fullInsert[0].id);
          console.log("🧹 Test data cleaned up");
        }
      }
    } catch (e: any) {
      results.errors.push({
        check: "banners_full_insert_exception",
        error: e.message,
        stack: e.stack,
      });
    }

    // ====================================================================
    // CHECK 4: Test Each Field Individually
    // ====================================================================
    console.log("\n📋 CHECK 4: Testing Each Field Individually");
    
    const fieldsToTest = Object.keys(currentCodeFields);
    const fieldResults: any = {
      working: [],
      failing: [],
    };

    for (const field of fieldsToTest) {
      try {
        const testData: any = {
          title: "FIELD_TEST_" + field,
        };
        testData[field] = (currentCodeFields as any)[field];

        const { data, error } = await supabase
          .from("banners")
          .insert(testData)
          .select();

        if (error) {
          fieldResults.failing.push({
            field,
            error: error.message,
            code: error.code,
          });
          console.log(`❌ Field '${field}' failed:`, error.message);
        } else {
          fieldResults.working.push(field);
          console.log(`✅ Field '${field}' works`);
          
          // Clean up
          if (data?.[0]?.id) {
            await supabase.from("banners").delete().eq("id", data[0].id);
          }
        }
      } catch (e: any) {
        fieldResults.failing.push({
          field,
          error: e.message,
        });
      }
    }

    results.checks.push({
      check: "individual_field_testing",
      workingFields: fieldResults.working,
      failingFields: fieldResults.failing,
    });

    // ====================================================================
    // CHECK 5: Storage Buckets
    // ====================================================================
    console.log("\n📋 CHECK 5: Storage Buckets");
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

      if (bucketError) {
        results.errors.push({
          check: "storage_buckets",
          error: bucketError.message,
        });
      } else {
        const bannerBucket = buckets?.find(b => b.name === "banners");
        results.checks.push({
          check: "storage_buckets",
          status: bannerBucket ? "✅ Banner bucket exists" : "⚠️  Banner bucket NOT found",
          allBuckets: buckets?.map(b => b.name) || [],
        });
        console.log("Storage buckets:", buckets?.map(b => b.name));
      }
    } catch (e: any) {
      results.warnings.push({
        check: "storage_buckets",
        error: e.message,
      });
    }

    // ====================================================================
    // CHECK 6: Current Banners Count
    // ====================================================================
    console.log("\n📋 CHECK 6: Current Banners in Database");
    try {
      const { count, error } = await supabase
        .from("banners")
        .select("*", { count: "exact", head: true });

      if (error) {
        results.errors.push({
          check: "banners_count",
          error: error.message,
        });
      } else {
        results.checks.push({
          check: "banners_count",
          status: "✅ SUCCESS",
          count: count || 0,
        });
        console.log(`Total banners in database: ${count || 0}`);
      }
    } catch (e: any) {
      results.warnings.push({
        check: "banners_count",
        error: e.message,
      });
    }

    // ====================================================================
    // GENERATE SUMMARY
    // ====================================================================
    const errorCount = results.errors.length;
    const warningCount = results.warnings.length;
    
    if (errorCount === 0 && warningCount === 0) {
      results.summary = "✅ ALL CHECKS PASSED - Database is healthy!";
    } else if (errorCount === 0) {
      results.summary = `⚠️  ${warningCount} warnings found - check details`;
    } else {
      results.summary = `❌ ${errorCount} errors and ${warningCount} warnings found`;
    }

    console.log("\n" + "=".repeat(60));
    console.log(results.summary);
    console.log("=".repeat(60));

    return c.json(results, errorCount > 0 ? 500 : 200);

  } catch (error: any) {
    console.error("🚨 DIAGNOSTIC TOOL CRASHED:", error);
    return c.json({
      error: "Diagnostic tool crashed",
      message: error.message,
      stack: error.stack,
    }, 500);
  }
}

/**
 * Quick banner upload test
 */
export async function testBannerUpload(c: Context) {
  console.log("🧪 Testing Banner Upload Flow...");
  
  try {
    const supabase = supabaseClient();
    
    // Step 1: Minimal working insert
    console.log("\nStep 1: Testing minimal insert (title + image_url only)");
    const minimal = {
      title: "Test Banner Minimal",
      image_url: "https://test.com/image.jpg",
    };
    
    const { data: minData, error: minError } = await supabase
      .from("banners")
      .insert(minimal)
      .select();
    
    if (minError) {
      console.error("❌ Minimal insert failed:", minError);
      return c.json({
        step: "minimal_insert",
        status: "FAILED",
        error: minError,
        attemptedData: minimal,
      }, 500);
    }
    
    console.log("✅ Minimal insert SUCCESS:", minData?.[0]?.id);
    const testId1 = minData?.[0]?.id;
    
    // Step 2: Add one field at a time
    console.log("\nStep 2: Testing with published_at field");
    const withPublished = {
      title: "Test Banner With Published",
      image_url: "https://test.com/image.jpg",
      published_at: new Date().toISOString(),
    };
    
    const { data: pubData, error: pubError } = await supabase
      .from("banners")
      .insert(withPublished)
      .select();
    
    if (pubError) {
      console.error("❌ Insert with published_at FAILED:", pubError);
      
      // Cleanup
      if (testId1) await supabase.from("banners").delete().eq("id", testId1);
      
      return c.json({
        step: "published_at_insert",
        status: "FAILED",
        error: pubError,
        message: "The 'published_at' column does not exist in your banners table",
        recommendation: "Add 'published_at TIMESTAMPTZ' column to your banners table, or remove it from the insert code",
        attemptedData: withPublished,
      }, 500);
    }
    
    console.log("✅ Insert with published_at SUCCESS:", pubData?.[0]?.id);
    const testId2 = pubData?.[0]?.id;
    
    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    if (testId1) await supabase.from("banners").delete().eq("id", testId1);
    if (testId2) await supabase.from("banners").delete().eq("id", testId2);
    
    return c.json({
      status: "✅ ALL TESTS PASSED",
      message: "Banner upload should work correctly",
      testsPassed: [
        "Minimal insert (title + image_url)",
        "Insert with published_at",
      ],
    });
    
  } catch (error: any) {
    console.error("🚨 Test crashed:", error);
    return c.json({
      error: "Test crashed",
      message: error.message,
      stack: error.stack,
    }, 500);
  }
}
