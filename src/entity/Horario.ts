import {Entity, Column, PrimaryGeneratedColumn, OneToMany, BaseEntity} from "typeorm"
import {JornadaDia} from "./JornadaDia";
import {Turno} from "./Turno";

@Entity()
export class Horario extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    nombre: string
    @Column()
    tolerancia: number
    @Column()
    color: string
    @Column()
    area: string
    @Column({nullable: true})
    descripcion: string
    @Column()
    diasIntercalados: boolean
    @Column()
    jornadasDosDias: boolean
    @OneToMany(() => JornadaDia, (jornadaDia) => jornadaDia.horario)
    jornadaDias: JornadaDia[]
}