
void decode_lorawan_payload ( struct lgw_pkt_rx_s *rxpkt, int  num, int fcnt, int fport, bool is_confirmed, uint8_t *data, uint8_t len )
{

    int buff_index = 0;
    uint32_t value_u = 0;
    int16_t value_i = 0;

    char mqtt_buff[MQTT_BUFF_SIZE];

    int send_smart_temperature_event = 0;
    int send_smart_humidity_event = 0;

    bool tamper_state = false;
    bool infrared_state = false;
    bool door_sensor_state = false;
    bool smoke_state = false;
    bool gas_state = false;
    bool flood_state = false;

    float battery_voltage = 0.0;
    uint32_t downlink_count = 0;
    uint32_t localtime_sec = 0;
    uint32_t heartbeat_interval = 0;
    float temperature = 0.0;
    float humidity = 0.0;
    uint8_t button_state = 0;


    if ( fport != 210 )
    {
        return;
    }

    if ( len < 3 )
    {
        return;
    }

    buff_index = 1;

    while ( 1 )
    {
        switch ( data[buff_index] )
        {

            case 0x01:
                MSG (  "--payload--  model [%d]\n", data[buff_index + 1] );

                switch ( data[buff_index + 1] )
                {
                    case 0x01:
                        sprintf ( g_node_object.model, "AN-301" );
                        break;

                    case 0x02:
                        sprintf ( g_node_object.model, "AN-302" );
                        break;

                    case 0x03:
                        sprintf ( g_node_object.model, "AN-303" );
                        break;

                    case 0x04:
                        sprintf ( g_node_object.model, "AN-304" );
                        break;

                    case 0x05:
                        sprintf ( g_node_object.model, "AN-102D" );
                        break;

                    case 0x07:
                        sprintf ( g_node_object.model, "M100C" );
                        break;

                    case 0x08:
                        sprintf ( g_node_object.model, "M101A" );
                        break;

                    case 0x09:
                        sprintf ( g_node_object.model, "M102A" );
                        break;

                    case 0x0a:
                        sprintf ( g_node_object.model, "M300C" );
                        break;

                    case 0x0b:
                        sprintf ( g_node_object.model, "AN-103A" );
                        break;

                    case 0x0c:
                        sprintf ( g_node_object.model, "AN-101" );
                        break;

                    case 0x0d:
                        sprintf ( g_node_object.model, "AN-102C" );
                        break;

                    case 0x0e:
                        sprintf ( g_node_object.model, "AN-106" );
                        break;

                    case 0x0f:
                        sprintf ( g_node_object.model, "AN-202A" );
                        break;

                    case 0x10:
                        sprintf ( g_node_object.model, "AN-203A" );
                        break;

                    case 0x11:
                        sprintf ( g_node_object.model, "AN-204A" );
                        break;

                    case 0x12:
                        sprintf ( g_node_object.model, "EFM02" );
                        break;

                    case 0x13:
                        sprintf ( g_node_object.model, "kongqihezi" );
                        break;

                    case 0x14:
                        sprintf ( g_node_object.model, "lajitong" );
                        break;

                    case 0x15:
                        sprintf ( g_node_object.model, "GPS" );
                        break;

                    case 0x16:
                        sprintf ( g_node_object.model, "AN-305D" );
                        break;

                    case 0x17:
                        sprintf ( g_node_object.model, "EL300A" );
                        break;

                    case 0x18:
                        sprintf ( g_node_object.model, "CM101" );
                        break;

                    case 0x19:
                        sprintf ( g_node_object.model, "AN-217" );
                        break;

                    case 0x1a:
                        sprintf ( g_node_object.model, "kongqikaiguan" );
                        break;

                    case 0x1b:
                        sprintf ( g_node_object.model, "JTY-GD-H605" );
                        break;

                    case 0x1c:
                        sprintf ( g_node_object.model, "AN-219" );
                        break;

                    case 0x1d:
                        sprintf ( g_node_object.model, "WN_SJSYOA" );
                        break;

                    case 0x1e:
                        sprintf ( g_node_object.model, "xiongpai" );
                        break;

                    case 0x20:
                        sprintf ( g_node_object.model, "AN-220" );
                        break;

                    case 0x21:
                        sprintf ( g_node_object.model, "IA100A" );
                        break;

                    case 0x22:
                        sprintf ( g_node_object.model, "AN-214" );
                        break;

                    case 0x23:
                        sprintf ( g_node_object.model, "AN-215" );
                        break;

                    case 0x24:
                        sprintf ( g_node_object.model, "AN-305A" );
                        break;

                    case 0x25:
                        sprintf ( g_node_object.model, "AN-305B" );
                        break;

                    case 0x26:
                        sprintf ( g_node_object.model, "AN-305C" );
                        break;

                    case 0x27:
                        sprintf ( g_node_object.model, "AN-310" );
                        break;

                    case 0x29:
                        sprintf ( g_node_object.model, "FP100A" );
                        break;

                    case 0x2a:
                        sprintf ( g_node_object.model, "SENSOR_BOX_AGRIC" );
                        break;

                    case 0x2b:
                        sprintf ( g_node_object.model, "SENSOR_BOX_MODBUS" );
                        break;

                    case 0x2c:
                        sprintf ( g_node_object.model, "AN-207" );
                        break;

                    case 0x2d:
                        sprintf ( g_node_object.model, "AN-208" );
                        break;

                    case 0x2e:
                        sprintf ( g_node_object.model, "AN-108B" );
                        break;

                    case 0x2f:
                        sprintf ( g_node_object.model, "AN-122" );
                        break;

                    case 0x30:
                        sprintf ( g_node_object.model, "AN-201C" );
                        break;

                    case 0x31:
                        sprintf ( g_node_object.model, "CU300A" );
                        break;

                    case 0x32:
                        sprintf ( g_node_object.model, "JTY-GD-H605" );
                        break;

                    case 0x33:
                        sprintf ( g_node_object.model, "Ci-TC-01" );
                        break;

                    case 0x34:
                        sprintf ( g_node_object.model, "AN-211A" );
                        break;

                    case 0x35:
                        sprintf ( g_node_object.model, "AN-307" );
                        break;

                    case 0x3b:
                        sprintf ( g_node_object.model, "M101A-AN-113" );
                        break;

                    case 0x3c:
                        sprintf ( g_node_object.model, "M300C-AN-113" );
                        break;

                    case 0x3d:
                        sprintf ( g_node_object.model, "Q9_AN204C" );
                        break;

                    case 0x3e:
                        sprintf ( g_node_object.model, "AJ761" );
                        break;

                    case 0x3f:
                        sprintf ( g_node_object.model, "AN-103C" );
                        break;

                    case 0x40:
                        sprintf ( g_node_object.model, "D-BOX" );
                        break;

                    case 0x41:
                        sprintf ( g_node_object.model, "AN-223" );
                        break;

                    case 0x42:
                        sprintf ( g_node_object.model, "AN_JTY_GD_H386" );
                        break;

                    case 0x43:
                        sprintf ( g_node_object.model, "JC-RS801" );
                        break;

                    case 0x44:
                        sprintf ( g_node_object.model, "AN-306" );
                        break;

                    case 0x45:
                        sprintf ( g_node_object.model, "AN-308" );
                        break;

                    case 0x46:
                        sprintf ( g_node_object.model, "CU803" );
                        break;

                    case 0x47:
                        sprintf ( g_node_object.model, "DS803" );
                        break;

                    case 0x48:
                        sprintf ( g_node_object.model, "DS501" );
                        break;

                    case 0x49:
                        sprintf ( g_node_object.model, "CU600" );
                        break;

                    case 0x4a:
                        sprintf ( g_node_object.model, "CU601" );
                        break;

                    case 0x4b:
                        sprintf ( g_node_object.model, "CU606" );
                        break;

                    case 0x4e:
                        sprintf ( g_node_object.model, "AN-224" );
                        break;

                    case 0x4f:
                        sprintf ( g_node_object.model, "EX-201" );
                        break;

                    case 0x50:
                        sprintf ( g_node_object.model, "M200C" );
                        break;

                    case 0x51:
                        sprintf ( g_node_object.model, "JTY-AN-503A" );
                        break;

                    case 0x55:
                        sprintf ( g_node_object.model, "EX-205" );
                        break;
                }

                buff_index = buff_index + 2;

                sprintf ( g_lgw.lw_node_buf[num].model , g_node_object.model );

                break;

            case 0x02:
                downlink_count = ( data[buff_index + 1] << 24 ) + ( data[buff_index + 2] << 16 ) + ( data[buff_index + 3] << 8 ) + data[buff_index + 4];
                MSG (  "--payload--  downlink count [%d]\n", downlink_count );

                sprintf ( g_node_object.downlink_fcnt, "%d" , downlink_count );

                buff_index = buff_index + 5;
                break;

            case 0x03:
                MSG (  "--payload--  tamper event [%d]\n", data[buff_index + 1] );

                tamper_state = ( bool ) data[buff_index + 1];

                g_lgw.lw_node_buf[num].common_tamper_state = tamper_state;

                sprintf ( g_node_object.tamper_event_stat, "%d" , tamper_state );

                buff_index = buff_index + 2;

                g_node_object.event_num++;

                break;

            case 0x04:
                value_u = ( data[buff_index + 1] << 8 ) + data[buff_index + 2];
                MSG (  "--payload--  battery voltage [%d]\n", value_u  );
                buff_index = buff_index + 3;
                battery_voltage = ( float ) value_u / 1000;
                sprintf ( g_node_object.battery_voltage, "%.2f" , battery_voltage );

                g_lgw.lw_node_buf[num].common_battery_voltage = value_u;

                break;

            case 0x05:
                MSG (  "--payload--  battery state [%d]\n", data[buff_index + 1] 	);

                g_lgw.lw_node_buf[num].common_battery_state = data[buff_index + 1];

                if ( data[buff_index + 1] == 1 )
                {
                    g_node_object.event_num++;
                    sprintf ( g_node_object.battery_event, "%d" , data[buff_index + 1] );
                }
                else
                {
                    sprintf ( g_node_object.battery_state, "%d" , data[buff_index + 1] );
                }

                buff_index = buff_index + 2;
                break;

            case 0x06:
                MSG (  "--payload--  boot version [%s]\n", ( char * ) data + ( buff_index + 1 )	);
                sprintf ( g_node_object.boot_version, "%s" , ( char * ) data + ( buff_index + 1 ) );

                buff_index = buff_index + strlen ( ( char * ) data + ( buff_index + 1 ) ) + 2;
                break;

            case 0x07:
                MSG (  "--payload--  main version [%s]\n", ( char * ) data + ( buff_index + 1 )	);
                sprintf ( g_node_object.main_version, "%s" , ( char * ) data + ( buff_index + 1 ) );

                buff_index = buff_index + strlen ( ( char * ) data + ( buff_index + 1 ) ) + 2;
                break;

            case 0x08:
                MSG (  "--payload--  app version [%s]\n", ( char * ) data + ( buff_index + 1 )	);
                sprintf ( g_node_object.app_version, "%s" , ( char * ) data + ( buff_index + 1 ) );

                buff_index = buff_index + strlen ( ( char * ) data + ( buff_index + 1 ) ) + 2;
                break;

            case 0x09:
                MSG (  "--payload--  hardware version [%s]\n", ( char * ) data + ( buff_index + 1 )	);
                sprintf ( g_node_object.hardware_version, "%s" , ( char * ) data + ( buff_index + 1 ) );

                buff_index = buff_index + strlen ( ( char * ) data + ( buff_index + 1 ) ) + 2;
                break;

            case 0x0a:
                value_u = ( data[buff_index + 1] << 24 ) + ( data[buff_index + 2] << 16 ) + ( data[buff_index + 3] << 8 ) + data[buff_index + 4];
                MSG (  "--payload--  p2p update frequency [%d] Hz\n", value_u	);

                buff_index = buff_index + 5;
                break;

            case 0x0b:
                value_u = ( data[buff_index + 1] << 24 ) + ( data[buff_index + 2] << 16 ) + ( data[buff_index + 3] << 8 ) + data[buff_index + 4];
                MSG (  "--payload--  p2p config frequency [%d] Hz\n", value_u	);

                buff_index = buff_index + 5;
                break;

            case 0x0c:
                MSG (  "--payload--  radio chip [%s]\n", ( char * ) data + ( buff_index + 1 )	);

                buff_index = buff_index + strlen ( ( char * ) data + ( buff_index + 1 ) ) + 2;
                break;

            case 0x0d:
                MSG (  "--payload--  reset cause [%s]\n", ( char * ) data + ( buff_index + 1 )	);

                buff_index = buff_index + strlen ( ( char * ) data + ( buff_index + 1 ) ) + 2;
                break;

            case 0x0e:
                MSG (  "--payload--  lorawan region [%s]\n", ( char * ) data + ( buff_index + 1 )	);

                buff_index = buff_index + strlen ( ( char * ) data + ( buff_index + 1 ) ) + 2;
                break;

            case 0x0f:
                MSG (  "--payload--  at response [%s]\n", ( char * ) data + ( buff_index + 1 )	);
                buff_index = buff_index + strlen ( ( char * ) data + ( buff_index + 1 ) ) + 2;
                break;

            case 0x10:
                value_i = ( int16_t ) ( data[buff_index + 1] << 8 ) + ( int16_t ) data[buff_index + 2];
                MSG (  "--payload--  temperature [%d]\n", value_i	);
                buff_index = buff_index + 3;
                temperature = ( float ) value_i / 100;
                sprintf ( g_node_object.temperature, "%.1f" , temperature );
                g_lgw.lw_node_buf[num].temperature = value_i;
                break;

            case 0x11:
                MSG (  "--payload--  temperature event [%d]\n", data[buff_index + 1] );
                sprintf ( g_node_object.temperature_event, "%d" , data[buff_index + 1] );
                g_lgw.lw_node_buf[num].temperature_state = data[buff_index + 1];
                buff_index = buff_index + 2;
                break;

            case 0x12:
                value_u = ( data[buff_index + 1] << 8 ) + data[buff_index + 2];
                MSG (  "--payload--  humidity  [%d]\n", value_u	);
                buff_index = buff_index + 3;
                humidity = ( float ) value_u / 10;
                sprintf ( g_node_object.humidity, "%.1f" , humidity );
                g_lgw.lw_node_buf[num].humidity = value_u;
                break;

            case 0x13:
                MSG (  "--payload--  humidity event [%d]\n", data[buff_index + 1] );
                sprintf ( g_node_object.humidity_event, "%d" , data[buff_index + 1] );
                g_lgw.lw_node_buf[num].humidity_state = data[buff_index + 1];
                buff_index = buff_index + 2;
                break;

            case 0x14:
                MSG (  "--payload--  SOS state [%d]\n", data[buff_index + 1] );
                sprintf ( g_node_object.sos_event, "%d" , data[buff_index + 1] );
                buff_index = buff_index + 2;
                g_node_object.event_num++;
                break;

            case 0x15:
                value_u = ( data[buff_index + 1] << 8 ) + data[buff_index + 2];
                MSG (  "--payload--  gas concentration  [%d] ppm\n", value_u	);
                buff_index = buff_index + 3;
                break;

            case 0x16:
                MSG (  "--payload--  gas  state [%d]\n", data[buff_index + 1] );
                gas_state = ( bool ) data[buff_index + 1];
                g_lgw.lw_node_buf[num].methane_concentration_state = gas_state;
                sprintf ( g_node_object.gas_state, "%d" , gas_state );
                buff_index = buff_index + 2;
                g_node_object.event_num++;

                break;

            case 0x17:
                MSG (  "--payload--  Infrared state [%d]\n", data[buff_index + 1] );

                infrared_state = ( bool ) data[buff_index + 1];
                buff_index = buff_index + 2;
                g_lgw.lw_node_buf[num].infrared_state = infrared_state;
                g_node_object.event_num++;
                sprintf ( g_node_object.infrared_state, "%d" , infrared_state );

                break;

            case 0x18:
                MSG (  "--payload--  magnet state [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x19:
                MSG (  "--payload--  brightness state [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x1a:
                value_u = ( data[buff_index + 1] << 8 ) + data[buff_index + 2];
                MSG (  "--payload--  direct current voltage  [%d]\n", value_u	);
                buff_index = buff_index + 3;
                break;

            case 0x1b:
                MSG (  "--payload--  sensor state [%d]\n", data[buff_index + 1] );
                g_lgw.lw_node_buf[num].common_sensor_state = data[buff_index + 1];
                sprintf ( g_node_object.sensor_state, "%d" , data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x1c:
                MSG (  "--payload--  button state [%d]\n", data[buff_index + 1] );

                button_state = data[buff_index + 1];
                buff_index = buff_index + 2;

                sprintf ( g_node_object.button_state, "%d" , button_state );

                break;

            case 0x1d:
                MSG (  "--payload--  gas concentration state [%d]\n", data[buff_index + 1] );
                gas_state = ( bool ) data[buff_index + 1];
                g_lgw.lw_node_buf[num].methane_concentration_state = gas_state;
                sprintf ( g_node_object.gas_state, "%d" , gas_state );
                buff_index = buff_index + 2;
                g_node_object.event_num++;

                break;

            case 0x1e:
                MSG (  "--payload--  noxious gas concentration state [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x1f:
                MSG (  "--payload--  oxygen  gas concentration state [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x20:
                MSG (  "--payload--  oxygen	gas concentration [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x21:
                MSG (  "--payload--  flood state [%d]\n", data[buff_index + 1] );
                flood_state = ( bool ) data[buff_index + 1];
                buff_index = buff_index + 2;
                g_lgw.lw_node_buf[num].flood_state = flood_state;
                g_node_object.event_num++;
                sprintf ( g_node_object.flood_event_stat, "%d" , flood_state );

                break;

            case 0x22:
                MSG (  "--payload--  cloud circuit breaker [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x23:
                MSG (  "--payload--  noxious gas concentration [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x24:
                MSG (  "--payload--  DoorSensor event [%d]\n", data[buff_index + 1] );

                door_sensor_state = ( bool ) data[buff_index + 1];
                buff_index = buff_index + 2;
                g_lgw.lw_node_buf[num].door_sensor_state = door_sensor_state;

                g_node_object.event_num++;
                sprintf ( g_node_object.door_sensor_event_state, "%d" , door_sensor_state );
                break;

            case 0x25:
                MSG (  "--payload--  switch address [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x26:
                MSG (  "--payload--  switch type [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x27:
                MSG (  "--payload--  line voltage [%d]\n", ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x28:
                MSG (  "--payload--  current leakage [%d]\n", ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x29:
                MSG (  "--payload--  line power [%d]\n", ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x2a:
                MSG (  "--payload--  line current [%d]\n", ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x2b:
                MSG (  "--payload--  circuit-breaker alarm [%d]\n", ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x2c:
                MSG (  "--payload--  power consumption [%d]\n",  ( data[buff_index + 1] << 24 ) + ( data[buff_index + 2] << 16 ) + ( data[buff_index + 3] << 8 ) + data[buff_index + 4] );
                buff_index = buff_index + 5;
                break;

            case 0x2e:
                MSG (  "--payload--  circuit-breaker control [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x2f:
                MSG (  "--payload--  switch quantity [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x30:
                MSG (  "--payload--  error code [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x31:
                MSG (  "--payload--  smoke state [%d]\n", data[buff_index + 1] );
                smoke_state = ( bool ) data[buff_index + 1];
                buff_index = buff_index + 2;
                g_lgw.lw_node_buf[num].smoke_state = smoke_state;
                g_node_object.event_num++;
                sprintf ( g_node_object.smoke_event, "%d" , smoke_state );
                break;

            case 0x32:
                MSG (  "--payload--  single smoke alarm status [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x3b:
                MSG (  "--payload--  single smoke alarm status [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x6d:
                MSG (  "--payload--  Data Packet Type [%d]\n", data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x72:
                MSG (  "--payload--  IrDACount [%d]\n",  ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x73:
                MSG (  "--payload--  soaking duration [%d] min\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                g_lgw.lw_node_buf[num].flood_soaking_time = ( ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                sprintf ( g_node_object.flood_soaking_time, "%d" ,  ( ( data[buff_index + 1] << 8 ) + data[buff_index + 2] )  );
                buff_index = buff_index + 3;
                break;

            case 0x74:
                MSG (  "--payload--  smoke blue PA [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );

                buff_index = buff_index + 3;
                break;

            case 0x75:
                MSG (  "--payload--  smoke red PA [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );

                buff_index = buff_index + 3;
                break;

            case 0x76:
                MSG (  "--payload--  DoorSensor state [%d]\n", data[buff_index + 1] );
                g_lgw.lw_node_buf[num].door_sensor_state = data[buff_index + 1];
                sprintf ( g_node_object.door_sensor_status_stat, "%d" , data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x77:
                MSG (  "--payload--  tamper state [%d]\n", data[buff_index + 1] );
                g_lgw.lw_node_buf[num].common_tamper_state = data[buff_index + 1];
                sprintf ( g_node_object.tamper_status_stat, "%d" , data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x78:
                heartbeat_interval = ( data[buff_index + 1] << 24 ) + ( data[buff_index + 2] << 16 ) + ( data[buff_index + 3] << 8 ) + data[buff_index + 4];
                MSG (  "--payload--  interval [%d]\n", heartbeat_interval );

                sprintf ( g_node_object.heartbeat_interval, "%d" , heartbeat_interval );

                buff_index = buff_index + 5;
                break;

            case 0x79:
                localtime_sec = ( data[buff_index + 1] << 24 ) + ( data[buff_index + 2] << 16 ) + ( data[buff_index + 3] << 8 ) + data[buff_index + 4];
                MSG (  "--payload--  time [%u]\n", localtime_sec );

                if ( localtime_sec == 0 )
                {
                    localtime_sec++;
                }

                sprintf ( g_node_object.localtime_sec, "%d" , localtime_sec );

                buff_index = buff_index + 5;
                break;

            case 0x7a:
                MSG (  "--payload--  methane [%d] ppm\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                sprintf ( g_node_object.methane, "%d" , ( data[buff_index + 1] << 8 ) + data[buff_index + 2]  );
                buff_index = buff_index + 3;
                break;

            case 0x7b:
                MSG (  "--payload--  SO2 [%d]\n",	  ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x7c:
                MSG (  "--payload--  NO2 [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x7d:
                MSG (  "--payload--  battery voltage state [%d]\n",	  data[buff_index + 1] );
                g_lgw.lw_node_buf[num].common_battery_state = data[buff_index + 1];
                sprintf ( g_node_object.battery_state, "%d" , data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x7E:
                MSG (  "--payload--  power down [%d]\n",	  data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x7F:
                MSG (  "--payload--  ADC [%d]\n",	 ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x80:
                MSG (  "--payload--  Level [%d]\n",	 ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                g_lgw.lw_node_buf[num].radar_ranging_liquid_level = ( data[buff_index + 1] << 8 ) + data[buff_index + 2];
                sprintf ( g_node_object.radar_ranging_liquid_level, "%d" , g_lgw.lw_node_buf[num].radar_ranging_liquid_level );
                buff_index = buff_index + 3;
                break;

            case 0x81:
                MSG (  "--payload--  Level_event [%d]\n",   data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x82:
                MSG (  "--payload--  self_check [%d]\n",   data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x83:
                MSG (  "--payload--  mute [%d]\n",   data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x84:
                MSG (  "--payload--  smoke state [%d]\n",	data[buff_index + 1] );
                smoke_state = ( bool ) data[buff_index + 1];
                buff_index = buff_index + 2;
                g_lgw.lw_node_buf[num].smoke_state = smoke_state;
                sprintf ( g_node_object.smoke_state, "%d" , smoke_state );
                break;

            case 0x85:
                MSG (  "--payload--  wet  state [%d]\n",	data[buff_index + 1] );
                flood_state = ( bool ) data[buff_index + 1];
                buff_index = buff_index + 2;
                g_lgw.lw_node_buf[num].flood_state = flood_state;
                sprintf ( g_node_object.flood_status_stat, "%d" , flood_state );
                break;

            case 0x86:
                MSG (	"--payload-- bell state [%d]\n",	 data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x87:
                MSG (	"--payload-- backlight state [%d]\n",	 data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x88:
                MSG (	"--payload-- countdown	[%d]\n",	 data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x89:
                MSG (	"--payload-- timer	[%d]\n",	 data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x8a:
                MSG ( "--payload-- formaldehyde [%d]\n",	 ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x8b:
                MSG (	"--payload-- airQuality [%d]\n",	 data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x8c:
                MSG (	"--payload-- SetTempAlarm  [%d]\n",  data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x8f:
                MSG (	"--payload-- RS485Chan	 [%d]\n",  data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x90:
                value_u = ( data[buff_index + 1] << 24 ) + ( data[buff_index + 2] << 16 ) + ( data[buff_index + 3] << 8 ) + data[buff_index + 4];
                MSG  ( "BleBeaconID [%d] \n", value_u	);
                buff_index = buff_index + 5;
                break;

            case 0x91:
                MSG (	"--payload-- BleRSSI1m	  [%d]\n",	data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x92:
                MSG (	"--payload-- BleRSSI	 [%d]\n",  data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x93:
                MSG (	"--payload-- BatteryPercentage	 [%d]\n",  data[buff_index + 1] );
                g_lgw.lw_node_buf[num].common_battery_level = data[buff_index + 1];
                buff_index = buff_index + 2;
                break;

            case 0x94:
                MSG ( "--payload-- RS485 addr	 [%d]\n",  data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x95:

                int modbus_len = data[buff_index + 1];
                MSG ( "--payload-- MODBUS data len [%d]\n",  modbus_len );

                buff_index = buff_index + 2 + modbus_len;

                break;

            case 0x96:
                MSG ( "--payload-- swicth lock status [%d]\n",  data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x97:
                MSG ( "--payload-- v_rms [%d]\n",   ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x98:
                MSG ( "--payload-- am [%d]\n",	 ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x99:
                MSG ( "--payload-- wattful_power [%d]\n",  ( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x9a:
                value_u = ( data[buff_index + 1] << 24 ) + ( data[buff_index + 2] << 16 ) + ( data[buff_index + 3] << 8 ) + data[buff_index + 4];
                MSG ( "--payload-- electric_energy [%d] \n", value_u	);

                buff_index = buff_index + 5;
                break;

            case 0x9b:
                MSG ( "--payload-- liquid_level_STATE [%d]\n",  data[buff_index + 1] );
                g_lgw.lw_node_buf[num].radar_ranging_liquid_level_state = data[buff_index + 1];
                buff_index = buff_index + 2;
                break;

            case 0x9c:
                MSG ( "--payload-- PRESSURE_STATE [%d]\n",  data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0x9d:
                MSG ( "--payload-- h2s [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;


            case 0x9e:
                MSG ( "--payload-- nh4 [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0x9f:
                MSG ( "--payload-- hcho [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0xa0:
                MSG ( "--payload-- tovc [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0xa2:
                MSG ( "--payload-- acc_diff_abs [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0xa3:
                MSG ( "--payload-- acc_abs [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0xa4:
                MSG ( "--payload-- acc_x [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0xa5:
                MSG ( "--payload-- acc_y [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0xa6:
                MSG ( "--payload-- acc_z [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0xa7:
                MSG ( "--payload-- acc_attr [%d]\n",  data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0xa8:
                MSG ( "--payload-- acc_attr_event [%d]\n",  data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0xa9:
                MSG ( "--payload-- TEMPERATURE_WARNING_ATTR [%d]\n",  data[buff_index + 1] );
                sprintf ( g_node_object.temperature_state, "%d" , data[buff_index + 1] );
                g_lgw.lw_node_buf[num].temperature_state = data[buff_index + 1];
                buff_index = buff_index + 2;
                break;

            case 0xaa:
                MSG ( "--payload-- TEMPERATURE [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                temperature = ( float ) ( ( data[buff_index + 1] << 8 ) + data[buff_index + 2] ) / 10.0;
                sprintf ( g_node_object.temperature, "%.1f" , temperature );
                g_lgw.lw_node_buf[num].temperature = temperature * 100;

                buff_index = buff_index + 3;
                break;

            case 0xab:
                MSG ( "--payload-- CMD_RESP [%d]\n",	( data[buff_index + 1] << 8 ) + data[buff_index + 2] );
                buff_index = buff_index + 3;
                break;

            case 0xac:
                MSG ( "--payload-- WATER_HAMMER_ATTR [%d]\n",  data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0xad:
                value_u = ( data[buff_index + 1] << 24 ) + ( data[buff_index + 2] << 16 ) + ( data[buff_index + 3] << 8 ) + data[buff_index + 4];
                MSG ( "--payload-- WATER_HAMMER_CONTINUOUS_TIME [%d] \n", value_u	);

                buff_index = buff_index + 5;
                break;

            case 0xae:
                MSG ( "--payload-- WATER_HAMMER_EVENT [%d]\n",	data[buff_index + 1] );
                buff_index = buff_index + 2;
                break;

            case 0xb9:
                value_u = ( data[buff_index + 1] << 24 ) + ( data[buff_index + 2] << 16 ) + ( data[buff_index + 3] << 8 ) + data[buff_index + 4];
                MSG ( "--payload-- radar ranging distance [%d]\n",	value_u );
                g_lgw.lw_node_buf[num].radar_ranging_distance = value_u;
                sprintf ( g_node_object.radar_ranging_distance, "%d" , value_u );
                buff_index = buff_index + 5;
                break;

            default:
                return;
        }

        if ( buff_index >= len )
        {
            break;
        }

    }


    char deviceID[17];
    memset ( deviceID, 0, sizeof ( deviceID ) );
    sprintf ( deviceID, "%02x%02x%02x%02x%02x%02x%02x%02x", g_lgw.lw_node_buf[num].deveui[0], g_lgw.lw_node_buf[num].deveui[1], g_lgw.lw_node_buf[num].deveui[2],
              g_lgw.lw_node_buf[num].deveui[3], g_lgw.lw_node_buf[num].deveui[4], g_lgw.lw_node_buf[num].deveui[5], g_lgw.lw_node_buf[num].deveui[6], g_lgw.lw_node_buf[num].deveui[7] );

    buff_index = 0;

    if ( downlink_count != 0 )
    {
        g_lgw.lw_node_buf[num].dfcnt = downlink_count ;
    }

    if ( heartbeat_interval != 0 )
    {

        g_lgw.lw_node_buf[num].up_interval = heartbeat_interval ;

        if ( g_lgw.lw_node_buf[num].down_interval > 0 )
        {
            if ( g_lgw.lw_node_buf[num].down_interval != g_lgw.lw_node_buf[num].up_interval )
            {
                g_lgw.lw_node_buf[num].interval_state = M1_NODE_INTERVAL_STATE_CHECKING;
                g_lgw.lw_node_buf[num].send_interval_flag = true;
                send_node_interval_info ( num );
            }
            else
            {
                g_lgw.lw_node_buf[num].interval_state = M1_NODE_INTERVAL_STATE_OK;
                g_lgw.lw_node_buf[num].send_interval_flag = false;
                send_node_interval_info ( num );
                g_lgw.lw_node_buf[num].down_interval = 0;
            }
        }



    }

    if ( localtime_sec != 0 )
    {
        time_t t = time ( NULL );


        if ( ( t +  8 * 3600  - localtime_sec > 5 ) || ( localtime_sec - t +  8 * 3600 < 5 ) )
        {
            g_lgw.lw_node_buf[num].send_time_flag = true;
            MSG (  "--payload--  need send time to :%s\n", deviceID );
        }
        else
        {
            g_lgw.lw_node_buf[num].send_time_flag = false;

        }
    }



    switch ( g_lgw.lw_node_buf[num].device_type )
    {
        case WINEXT_DEVICE_UNDEFINE:

            break;

        case WINEXT_DEVICE_SMOKE:

            if ( smoke_state )
            {

                if ( time ( NULL ) - g_lgw.clear_voice_t < 60 )
                {
                    g_lgw.lw_node_buf[num].send_clear_flag = true;
                    MSG (  "--payload--  smoke need send clear voice :%s\n", deviceID );

                }
                else
                {
                    g_lgw.lw_node_buf[num].send_clear_flag = false;
                }

            }

            break;

        case WINEXT_DEVICE_INFRARED:

            if ( infrared_state  )
            {

            }

            break;

        case WINEXT_DEVICE_DOOR_SENSOR:



            break;

        case WINEXT_DEVICE_GAS:

            if ( gas_state )
            {

                if ( time ( NULL ) - g_lgw.clear_voice_t < 60 )
                {
                    g_lgw.lw_node_buf[num].send_clear_flag = true;
                    MSG (  "--payload--  gas need send clear voice :%s\n", deviceID );

                }
                else
                {
                    g_lgw.lw_node_buf[num].send_clear_flag = false;
                }

            }

            break;

        case WINEXT_DEVICE_SOS:

            if ( button_state >= 1	)
            {
                g_node_object.event_num++;

            }

            break;

        case WINEXT_DEVICE_DOORBELL:

            if ( button_state >= 1	)
            {

                g_node_object.event_num++;

            }

            break;


        case WINEXT_DEVICE_SMART_BUTTON:

            if ( button_state >= 1	)
            {
                g_node_object.event_num++;
            }

            break;

        case WINEXT_DEVICE_TEMPERATURE_HUMIDITY_NOT_SCREEN:
        case WINEXT_DEVICE_TEMPERATURE_HUMIDITY_HAVE_SCREEN:
        case WINEXT_DEVICE_TEMPERATURE_HUMIDITY_AN303:

            break;

        case WINEXT_DEVICE_FLOOD:

            break;

        default:
            break;

    }


}


